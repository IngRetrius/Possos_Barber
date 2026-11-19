import "server-only";
import type { DbClient, Result } from "@possos/supabase";
import type { Service } from "./index";

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
