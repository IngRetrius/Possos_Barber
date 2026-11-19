import "server-only";
import { createTimeOff } from "@possos/barbers/server";
import type { TimeOff } from "@possos/barbers";
import { errorCode, type DbClient, type Result } from "@possos/supabase";
import { UPCOMING_STATUSES } from "./index";
import type {
  Appointment,
  AppointmentForNotification,
  AvailableSlot,
  ConfirmVia,
  ConflictingAppointment,
} from "./index";
import { BOOKING_ERROR_CODES, type BookingErrorCode } from "./internal/errors";

/**
 * API de servidor de booking. Cada función recibe el cliente de Supabase de quien actúa:
 * el de la sesión (`@possos/supabase/server`) para clientes y personal, o el de la clave
 * secreta (`/admin`) para el servidor de notificaciones. Las reglas viven en Postgres.
 * Fechas y horas en ISO 8601; días en `YYYY-MM-DD` (hora de Bogotá).
 */

type R<T> = Promise<Result<T, BookingErrorCode>>;

const fail = (error: { message?: string } | null) =>
  ({ ok: false, error: errorCode(error, BOOKING_ERROR_CODES) }) as const;

/** Horas libres de un día para un servicio; sin `barberId`, de todos los barberos. */
export async function getAvailableSlots(
  db: DbClient,
  input: { serviceId: string; day: string; barberId?: string },
): R<AvailableSlot[]> {
  const { data, error } = await db.rpc("get_available_slots", {
    p_service_id: input.serviceId,
    p_day: input.day,
    p_barber_id: input.barberId,
  });
  return error ? fail(error) : { ok: true, data };
}

/** Reserva del cliente. Sin `barberId` es "cualquiera disponible". */
export async function book(
  db: DbClient,
  input: { serviceId: string; startAt: string; barberId?: string },
): R<Appointment> {
  const { data, error } = await db.rpc("book_appointment", {
    p_service_id: input.serviceId,
    p_start_at: input.startAt,
    p_barber_id: input.barberId,
  });
  return error ? fail(error) : { ok: true, data };
}

/** Cita creada por el personal, también para clientes sin cuenta. */
export async function staffCreateAppointment(
  db: DbClient,
  input: { customerId: string; serviceId: string; barberId: string; startAt: string },
): R<Appointment> {
  const { data, error } = await db.rpc("staff_create_appointment", {
    p_customer_id: input.customerId,
    p_service_id: input.serviceId,
    p_barber_id: input.barberId,
    p_start_at: input.startAt,
  });
  return error ? fail(error) : { ok: true, data };
}

/** Cancela. El personal debe dar un motivo. */
export async function cancel(
  db: DbClient,
  input: { appointmentId: string; reason?: string },
): R<Appointment> {
  const { data, error } = await db.rpc("cancel_appointment", {
    p_id: input.appointmentId,
    p_reason: input.reason,
  });
  return error ? fail(error) : { ok: true, data };
}

/** Mueve la cita a otra hora (y opcionalmente a otro barbero) en una sola transacción. */
export async function reschedule(
  db: DbClient,
  input: { appointmentId: string; newStartAt: string; newBarberId?: string },
): R<Appointment> {
  const { data, error } = await db.rpc("reschedule_appointment", {
    p_id: input.appointmentId,
    p_new_start_at: input.newStartAt,
    p_new_barber_id: input.newBarberId,
  });
  return error ? fail(error) : { ok: true, data };
}

/** Confirma una cita reservada. Confirmar dos veces no es error. */
export async function confirmAppointment(
  db: DbClient,
  input: { appointmentId: string; via: ConfirmVia },
): R<Appointment> {
  const { data, error } = await db.rpc("confirm_appointment", {
    p_id: input.appointmentId,
    p_via: input.via,
  });
  return error ? fail(error) : { ok: true, data };
}

/** El personal aprueba o rechaza una reserva pendiente. */
export async function decidePending(
  db: DbClient,
  input: { appointmentId: string; approve: boolean },
): R<Appointment> {
  const { data, error } = await db.rpc("decide_pending", {
    p_id: input.appointmentId,
    p_approve: input.approve,
  });
  return error ? fail(error) : { ok: true, data };
}

/** Vino o no vino. Cada inasistencia suma al contador del cliente. */
export async function markAttendance(
  db: DbClient,
  input: { appointmentId: string; attended: boolean },
): R<Appointment> {
  const { data, error } = await db.rpc("mark_attendance", {
    p_id: input.appointmentId,
    p_attended: input.attended,
  });
  return error ? fail(error) : { ok: true, data };
}

/** El administrador reinicia el contador de inasistencias y quita la marca de aprobación. */
export async function resetNoShows(db: DbClient, customerId: string): R<null> {
  const { error } = await db.rpc("reset_no_shows", { p_customer_id: customerId });
  return error ? fail(error) : { ok: true, data: null };
}

/** Citas que ocupan un periodo de un barbero. */
export async function listConflictingAppointments(
  db: DbClient,
  input: { barberId: string; startsAt: string; endsAt: string },
): R<ConflictingAppointment[]> {
  const { data, error } = await db.rpc("list_conflicting_appointments", {
    p_barber_id: input.barberId,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
  });
  return error ? fail(error) : { ok: true, data };
}

/**
 * Crea un bloqueo y devuelve las citas que quedaron debajo, para que el barbero las mueva o
 * las cancele (docs/09). El bloqueo no espera a que se resuelvan.
 */
export async function blockTime(
  db: DbClient,
  input: { barberId: string; startsAt: string; endsAt: string; reason?: string },
): Promise<
  Result<
    { timeOff: TimeOff; conflicts: ConflictingAppointment[] },
    BookingErrorCode | "TIME_OFF_OVERLAP"
  >
> {
  const created = await createTimeOff(db, input);
  if (!created.ok) {
    return { ok: false, error: created.error };
  }
  const conflicts = await listConflictingAppointments(db, input);
  if (!conflicts.ok) {
    return conflicts;
  }
  return { ok: true, data: { timeOff: created.data, conflicts: conflicts.data } };
}

/** Contrato para notifications. Exige el cliente con la clave secreta (`@possos/supabase/admin`). */
export async function getAppointmentForNotification(
  db: DbClient,
  appointmentId: string,
): R<AppointmentForNotification | null> {
  const { data, error } = await db.rpc("get_appointment_for_notification", { p_id: appointmentId });
  return error ? fail(error) : { ok: true, data: data[0] ?? null };
}

/**
 * La próxima cita de un cliente que todavía no pasa (pendiente, reservada o confirmada), o null.
 * La usa F3 para no borrar una cuenta con una cita pendiente, y F5 para "Mis citas".
 */
export async function getNextAppointment(db: DbClient, customerId: string): R<Appointment | null> {
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("appointments")
    .select("*")
    .eq("customer_id", customerId)
    .in("status", UPCOMING_STATUSES)
    // Que no termine antes de ahora: el rango no queda estrictamente a la izquierda de `now`.
    .not("period", "sl", `[${now},${now}]`)
    .order("period", { ascending: true })
    .limit(1)
    .maybeSingle();
  return error ? fail(error) : { ok: true, data };
}
