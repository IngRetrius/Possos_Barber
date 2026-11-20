import "server-only";
import { errorCode, type DbClient, type Result } from "@possos/supabase";
import type { Charge, CommissionRate, SettlementRow } from "./index";
import { COMMISSIONS_ERROR_CODES, type CommissionsErrorCode } from "./internal/errors";

/**
 * API de servidor de commissions. Recibe el cliente de la sesión de quien actúa; las reglas
 * (quién cobra, corrige o anula) viven en Postgres. Días en `YYYY-MM-DD`, hora de Bogotá.
 */

type R<T> = Promise<Result<T, CommissionsErrorCode>>;

const fail = (error: { message?: string } | null) =>
  ({ ok: false, error: errorCode(error, COMMISSIONS_ERROR_CODES) }) as const;

/** Registra el cobro de una cita atendida. Sin `amountCop`, toma el precio de la reserva. */
export async function recordCharge(
  db: DbClient,
  input: { appointmentId: string; amountCop?: number },
): R<Charge> {
  const { data, error } = await db.rpc("record_charge", {
    p_appointment_id: input.appointmentId,
    p_amount_cop: input.amountCop,
  });
  return error ? fail(error) : { ok: true, data };
}

/** Corrige el monto. El barbero, solo el mismo día; el administrador, siempre. */
export async function updateCharge(
  db: DbClient,
  input: { chargeId: string; amountCop: number },
): R<Charge> {
  const { data, error } = await db.rpc("update_charge", {
    p_id: input.chargeId,
    p_amount_cop: input.amountCop,
  });
  return error ? fail(error) : { ok: true, data };
}

/** Anula un cobro con motivo. Solo el administrador. */
export async function voidCharge(
  db: DbClient,
  input: { chargeId: string; reason: string },
): R<Charge> {
  const { data, error } = await db.rpc("void_charge", {
    p_id: input.chargeId,
    p_reason: input.reason,
  });
  return error ? fail(error) : { ok: true, data };
}

/**
 * Liquidación de `from` a `to` (ambos incluidos). El barbero recibe solo la suya; el
 * administrador sin `barberId` recibe una fila por barbero.
 */
export async function getSettlement(
  db: DbClient,
  input: { from: string; to: string; barberId?: string },
): R<SettlementRow[]> {
  const { data, error } = await db.rpc("get_settlement", {
    p_from: input.from,
    p_to: input.to,
    p_barber_id: input.barberId,
  });
  return error ? fail(error) : { ok: true, data };
}

/** Porcentaje vigente del barbero, o null si no se ha definido. */
export async function getCommissionRate(db: DbClient, barberId: string): R<CommissionRate | null> {
  const { data, error } = await db
    .from("commission_rates")
    .select("*")
    .eq("barber_id", barberId)
    .maybeSingle();
  return error ? fail(error) : { ok: true, data };
}

/** Fija el porcentaje del barbero (0 a 100). Solo el administrador; RLS lo impide a los demás. */
export async function setCommissionRate(
  db: DbClient,
  input: { barberId: string; barberPct: number; updatedBy: string },
): R<CommissionRate> {
  const { data, error } = await db
    .from("commission_rates")
    .upsert({
      barber_id: input.barberId,
      barber_pct: input.barberPct,
      updated_by: input.updatedBy,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  return error ? fail(error) : { ok: true, data };
}

/** Cobros de unas citas (los que la sesión ve), para saber cuáles ya tienen cobro. */
export async function listChargesForAppointments(
  db: DbClient,
  appointmentIds: string[],
): R<Charge[]> {
  if (appointmentIds.length === 0) return { ok: true, data: [] };
  const { data, error } = await db.from("charges").select("*").in("appointment_id", appointmentIds);
  return error ? fail(error) : { ok: true, data };
}

/**
 * Cobros de `from` a `to` (días de Bogotá, ambos incluidos), anulados incluidos, del más nuevo al
 * más viejo. Sin `barberId`, todos los que la sesión ve.
 */
export async function listCharges(
  db: DbClient,
  input: { from: string; to: string; barberId?: string },
): R<Charge[]> {
  const next = new Date(`${input.to}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  let request = db
    .from("charges")
    .select("*")
    .gte("charged_at", `${input.from}T00:00:00-05:00`)
    .lt("charged_at", `${next.toISOString().slice(0, 10)}T00:00:00-05:00`);
  if (input.barberId) request = request.eq("barber_id", input.barberId);
  const { data, error } = await request.order("charged_at", { ascending: false });
  return error ? fail(error) : { ok: true, data };
}

/** Porcentajes que la sesión ve: el suyo para el barbero, todos para el administrador. */
export async function listCommissionRates(db: DbClient): R<CommissionRate[]> {
  const { data, error } = await db.from("commission_rates").select("*");
  return error ? fail(error) : { ok: true, data };
}
