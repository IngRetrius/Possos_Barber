/**
 * API pública de @possos/supabase: tipos de la base. Los clientes están en
 * `@possos/supabase/client` (navegador), `/server` (Server Components y Server Actions)
 * y `/admin` (solo servidor, salta RLS).
 *
 * Cada módulo reexporta solo los tipos de sus tablas (regla 7 de docs/08).
 */
export type { Database, Json } from "./database.types";
