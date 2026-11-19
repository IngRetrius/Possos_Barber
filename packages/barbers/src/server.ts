import "server-only";
import { errorCode, type DbClient, type Result } from "@possos/supabase";
import type { Barber, OpeningRange, PortfolioItem, TimeOff, WorkingHours } from "./index";
import { BARBERS_ERROR_CODES, type BarbersErrorCode } from "./internal/errors";

type R<T> = Promise<Result<T, BarbersErrorCode>>;

const fail = (error: { message?: string } | null) =>
  ({ ok: false, error: errorCode(error, BARBERS_ERROR_CODES) }) as const;

/** Barberos activos, por nombre. RLS deja verlos a cualquiera, con o sin sesión. */
export async function listActiveBarbers(db: DbClient): R<Barber[]> {
  const { data, error } = await db
    .from("barbers")
    .select("*")
    .eq("active", true)
    .order("display_name");
  return error ? fail(error) : { ok: true, data };
}

/** Horario semanal del barbero. Solo lo ven el barbero y el administrador. */
export async function getWorkingHours(db: DbClient, barberId: string): R<WorkingHours[]> {
  const { data, error } = await db
    .from("working_hours")
    .select("*")
    .eq("barber_id", barberId)
    .order("weekday")
    .order("start_time");
  return error ? fail(error) : { ok: true, data };
}

/** Bloqueos del barbero que se cruzan con `[from, to)` (ISO 8601). */
export async function listTimeOff(
  db: DbClient,
  input: { barberId: string; from: string; to: string },
): R<TimeOff[]> {
  const { data, error } = await db
    .from("time_off")
    .select("*")
    .eq("barber_id", input.barberId)
    .overlaps("period", `[${input.from},${input.to})`)
    .order("period");
  return error ? fail(error) : { ok: true, data };
}

/**
 * Crea un bloqueo con el candado del barbero. Puede caer encima de citas: para saber cuáles,
 * usa `blockTime()` de `@possos/booking/server`, que llama a esta y luego lista los cruces.
 */
export async function createTimeOff(
  db: DbClient,
  input: { barberId: string; startsAt: string; endsAt: string; reason?: string },
): R<TimeOff> {
  const { data, error } = await db.rpc("create_time_off", {
    p_barber_id: input.barberId,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_reason: input.reason,
  });
  return error ? fail(error) : { ok: true, data };
}

/** Borra un bloqueo. RLS solo deja al barbero dueño y al administrador. */
export async function deleteTimeOff(db: DbClient, id: string): R<null> {
  const { error } = await db.from("time_off").delete().eq("id", id);
  return error ? fail(error) : { ok: true, data: null };
}

/**
 * Horario de la barbería: los rangos de los barberos activos juntos, sin decir de quién es cada
 * uno. Lo puede leer cualquiera (`get_opening_hours`); la tabla working_hours no.
 */
export async function getOpeningHours(db: DbClient): R<OpeningRange[]> {
  const { data, error } = await db.rpc("get_opening_hours");
  return error ? fail(error) : { ok: true, data };
}

/** Barberos activos que hacen un servicio, por nombre. */
export async function listBarbersForService(db: DbClient, serviceId: string): R<Barber[]> {
  const { data, error } = await db
    .from("barbers")
    .select("*, barber_services!inner(service_id)")
    .eq("active", true)
    .eq("barber_services.service_id", serviceId)
    .order("display_name");
  if (error) return fail(error);
  return { ok: true, data: data.map(({ barber_services: _, ...barber }) => barber) };
}

/** Trabajos del portafolio de unos barberos, en su orden. Lectura pública. */
export async function listPortfolio(db: DbClient, barberIds: string[]): R<PortfolioItem[]> {
  if (barberIds.length === 0) return { ok: true, data: [] };
  const { data, error } = await db
    .from("portfolio_items")
    .select("*")
    .in("barber_id", barberIds)
    .order("sort_order")
    .order("created_at");
  return error ? fail(error) : { ok: true, data };
}

/** URL pública de una foto del barbero (`barber-photos`) o del portafolio (`portfolio`). */
export function publicImageUrl(
  db: DbClient,
  bucket: "barber-photos" | "portfolio",
  path: string,
): string {
  return db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
