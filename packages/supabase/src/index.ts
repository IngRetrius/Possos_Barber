/**
 * API pública de @possos/supabase: tipos de la base y utilidades sin dominio. Los clientes están
 * en `@possos/supabase/client` (navegador), `/server` (Server Components y Server Actions)
 * y `/admin` (solo servidor, salta RLS).
 *
 * Cada módulo reexporta solo los tipos de sus tablas (regla 7 de docs/08).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type { Database, Enums, Json, Tables, TablesInsert, TablesUpdate } from "./database.types";
export { errorCode, type Result } from "./result";

/** Cliente tipado con la base. Las API de servidor de los módulos lo reciben como primer argumento. */
export type DbClient = SupabaseClient<Database>;
