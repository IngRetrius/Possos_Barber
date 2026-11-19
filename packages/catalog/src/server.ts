import "server-only";
import type { DbClient, Result } from "@possos/supabase";
import type { Service } from "./index";
import type { ValidService } from "./internal/service-form";

/** Servicios activos en el orden en que se muestran. */
export async function listActiveServices(db: DbClient): Promise<Result<Service[], "UNKNOWN">> {
  const { data, error } = await db
    .from("services")
    .select("*")
    .eq("active", true)
    .order("sort_order")
    .order("name");
  return error ? { ok: false, error: "UNKNOWN" } : { ok: true, data };
}

/** Un servicio activo, o null si no existe o está inactivo. */
export async function getActiveService(
  db: DbClient,
  id: string,
): Promise<Result<Service | null, "UNKNOWN">> {
  const { data, error } = await db
    .from("services")
    .select("*")
    .eq("id", id)
    .eq("active", true)
    .maybeSingle();
  return error ? { ok: false, error: "UNKNOWN" } : { ok: true, data };
}

// ---------------------------------------------------------------------------------------------
// Panel del administrador (F6). RLS: solo el administrador escribe y ve los inactivos.
// ---------------------------------------------------------------------------------------------

type R<T> = Promise<Result<T, "UNKNOWN" | "NOT_FOUND" | "FORBIDDEN">>;

const failure = (error: { code?: string } | null) =>
  ({ ok: false, error: error?.code === "42501" ? "FORBIDDEN" : "UNKNOWN" }) as const;

/** Todos los servicios que la sesión ve (el administrador, también los inactivos), en orden. */
export async function listServices(db: DbClient): R<Service[]> {
  const { data, error } = await db
    .from("services")
    .select("*")
    .order("active", { ascending: false })
    .order("sort_order")
    .order("name");
  return error ? failure(error) : { ok: true, data };
}

/** Un servicio que la sesión ve, activo o no. */
export async function getService(db: DbClient, id: string): R<Service | null> {
  const { data, error } = await db.from("services").select("*").eq("id", id).maybeSingle();
  return error ? failure(error) : { ok: true, data };
}

/** Crea un servicio al final de la lista. */
export async function createService(db: DbClient, input: ValidService): R<Service> {
  const last = await db
    .from("services")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last.error) return failure(last.error);
  const { data, error } = await db
    .from("services")
    .insert({ ...input, sort_order: (last.data?.sort_order ?? 0) + 1 })
    .select("*")
    .single();
  return error ? failure(error) : { ok: true, data };
}

/** Cambia un servicio. El precio nuevo vale para las citas nuevas, no para las ya reservadas. */
export async function updateService(
  db: DbClient,
  id: string,
  patch: Partial<ValidService> & { active?: boolean },
): R<Service> {
  const { data, error } = await db
    .from("services")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) return failure(error);
  return data ? { ok: true, data } : { ok: false, error: "NOT_FOUND" };
}

/** Sube o baja un servicio un puesto en la lista (renumera el orden de todos). */
export async function moveService(db: DbClient, id: string, direction: "up" | "down"): R<null> {
  const all = await listServices(db);
  if (!all.ok) return all;
  const list = [...all.data].sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
  );
  const index = list.findIndex((s) => s.id === id);
  const other = direction === "up" ? index - 1 : index + 1;
  if (index < 0) return { ok: false, error: "NOT_FOUND" };
  if (other < 0 || other >= list.length) return { ok: true, data: null };
  [list[index], list[other]] = [list[other]!, list[index]!];
  for (const [position, service] of list.entries()) {
    if (service.sort_order === position + 1) continue;
    const { error } = await db
      .from("services")
      .update({ sort_order: position + 1 })
      .eq("id", service.id);
    if (error) return failure(error);
  }
  return { ok: true, data: null };
}
