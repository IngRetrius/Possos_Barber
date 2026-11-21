import "server-only";
import { errorCode, type DbClient, type Json, type Result } from "@possos/supabase";
import type { Barber, OpeningRange, PortfolioItem, TimeOff, WorkingHours } from "./index";
import { isOwnImagePath, type ImageBucket } from "./internal/images";
import type { WeeklyRange } from "./internal/weekly-hours";
import { BARBERS_ERROR_CODES, type BarbersErrorCode } from "./internal/errors";

type R<T> = Promise<Result<T, BarbersErrorCode>>;

const fail = (error: { code?: string; message?: string } | null) =>
  ({
    ok: false,
    // 23505: user_id repetido al enlazar una cuenta que ya tiene perfil.
    error: error?.code === "23505" ? "ALREADY_LINKED" : errorCode(error, BARBERS_ERROR_CODES),
  }) as const;

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

// ---------------------------------------------------------------------------------------------
// Panel (F6). RLS decide: el administrador escribe todo; el barbero, su horario, sus bloqueos,
// su perfil (sin activarse ni cambiar su intervalo) y su portafolio.
// ---------------------------------------------------------------------------------------------

/**
 * Barberos que la sesión puede ver, activos primero y por nombre. El administrador también ve
 * los inactivos; un barbero inactivo se ve a sí mismo.
 */
export async function listBarbers(db: DbClient): R<Barber[]> {
  const { data, error } = await db
    .from("barbers")
    .select("*")
    .order("active", { ascending: false })
    .order("display_name");
  return error ? fail(error) : { ok: true, data };
}

/** Un barbero que la sesión puede ver, o null. */
export async function getBarber(db: DbClient, id: string): R<Barber | null> {
  const { data, error } = await db.from("barbers").select("*").eq("id", id).maybeSingle();
  return error ? fail(error) : { ok: true, data };
}

/** Crea un barbero sin cuenta (la cuenta se enlaza al asignarle el rol). Solo el administrador. */
export async function createBarber(db: DbClient, input: { displayName: string }): R<Barber> {
  const { data, error } = await db
    .from("barbers")
    .insert({ display_name: input.displayName })
    .select("*")
    .single();
  return error ? fail(error) : { ok: true, data };
}

export type BarberPatch = Partial<
  Pick<
    Barber,
    | "display_name"
    | "job_title"
    | "bio"
    | "whatsapp_url"
    | "slot_interval_min"
    | "active"
    | "photo_path"
    | "user_id"
  >
>;

/**
 * Cambia el perfil. `active`, `slot_interval_min` y `user_id` (enlazar la cuenta) solo los cambia
 * el administrador (trigger). Una cuenta solo puede tener un perfil (`user_id` es único).
 */
export async function updateBarber(db: DbClient, id: string, patch: BarberPatch): R<Barber> {
  const { data, error } = await db
    .from("barbers")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) return fail(error);
  return data ? { ok: true, data } : { ok: false, error: "NOT_FOUND" };
}

/** Reemplaza el horario semanal completo en una transacción (`set_working_hours`). */
export async function setWorkingHours(
  db: DbClient,
  barberId: string,
  ranges: WeeklyRange[],
): R<WorkingHours[]> {
  const { data, error } = await db.rpc("set_working_hours", {
    p_barber_id: barberId,
    p_ranges: ranges as unknown as Json,
  });
  return error ? fail(error) : { ok: true, data };
}

/** Ids de los servicios que hace el barbero. */
export async function listBarberServiceIds(db: DbClient, barberId: string): R<string[]> {
  const { data, error } = await db
    .from("barber_services")
    .select("service_id")
    .eq("barber_id", barberId);
  return error ? fail(error) : { ok: true, data: data.map((r) => r.service_id) };
}

/**
 * Deja al barbero con exactamente esos servicios. Conserva el precio y la duración propios de
 * los que ya tenía. Solo el administrador.
 */
export async function setBarberServices(
  db: DbClient,
  barberId: string,
  serviceIds: string[],
): R<null> {
  const current = await listBarberServiceIds(db, barberId);
  if (!current.ok) return current;
  const remove = current.data.filter((id) => !serviceIds.includes(id));
  const add = serviceIds.filter((id) => !current.data.includes(id));
  if (remove.length) {
    const { error } = await db
      .from("barber_services")
      .delete()
      .eq("barber_id", barberId)
      .in("service_id", remove);
    if (error) return fail(error);
  }
  if (add.length) {
    const { error } = await db
      .from("barber_services")
      .insert(add.map((service_id) => ({ barber_id: barberId, service_id })));
    if (error) return fail(error);
  }
  return { ok: true, data: null };
}

/** Un servicio nuevo lo hacen estos barberos. Solo el administrador. */
export async function addServiceToBarbers(
  db: DbClient,
  serviceId: string,
  barberIds: string[],
): R<null> {
  if (barberIds.length === 0) return { ok: true, data: null };
  const { error } = await db.from("barber_services").upsert(
    barberIds.map((barber_id) => ({ barber_id, service_id: serviceId })),
    { ignoreDuplicates: true },
  );
  return error ? fail(error) : { ok: true, data: null };
}

/** Agrega un trabajo al final del portafolio. La imagen ya está en `portfolio/<barber_id>/`. */
export async function addPortfolioItem(
  db: DbClient,
  input: { barberId: string; imagePath: string; caption?: string | null },
): R<PortfolioItem> {
  if (!isOwnImagePath(input.barberId, input.imagePath)) return { ok: false, error: "FORBIDDEN" };
  const last = await db
    .from("portfolio_items")
    .select("sort_order")
    .eq("barber_id", input.barberId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last.error) return fail(last.error);
  const { data, error } = await db
    .from("portfolio_items")
    .insert({
      barber_id: input.barberId,
      image_path: input.imagePath,
      caption: input.caption?.trim() || null,
      sort_order: (last.data?.sort_order ?? 0) + 1,
    })
    .select("*")
    .single();
  return error ? fail(error) : { ok: true, data };
}

/** Borra un trabajo del portafolio y su imagen. */
export async function deletePortfolioItem(db: DbClient, id: string): R<null> {
  const { data, error } = await db
    .from("portfolio_items")
    .delete()
    .eq("id", id)
    .select("image_path")
    .maybeSingle();
  if (error) return fail(error);
  if (!data) return { ok: false, error: "NOT_FOUND" };
  await removeImage(db, "portfolio", data.image_path);
  return { ok: true, data: null };
}

/**
 * Cambia la foto del barbero por una que ya está en `barber-photos/<barber_id>/` y borra la
 * anterior.
 */
export async function setBarberPhoto(
  db: DbClient,
  input: { barberId: string; photoPath: string },
): R<Barber> {
  if (!isOwnImagePath(input.barberId, input.photoPath)) return { ok: false, error: "FORBIDDEN" };
  const before = await getBarber(db, input.barberId);
  if (!before.ok) return before;
  if (!before.data) return { ok: false, error: "NOT_FOUND" };
  const updated = await updateBarber(db, input.barberId, { photo_path: input.photoPath });
  if (updated.ok && before.data.photo_path && before.data.photo_path !== input.photoPath) {
    await removeImage(db, "barber-photos", before.data.photo_path);
  }
  return updated;
}

/** Borra una imagen de Storage. Si falla, queda un archivo huérfano; no es crítico. */
async function removeImage(db: DbClient, bucket: ImageBucket, path: string): Promise<void> {
  await db.storage.from(bucket).remove([path]);
}
