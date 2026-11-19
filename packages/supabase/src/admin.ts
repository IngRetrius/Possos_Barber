import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { publicEnv } from "./env";

/**
 * Cliente con la clave secreta: salta RLS. Solo para el servidor (cron de recordatorios,
 * webhook de Meta) y nunca para responder con datos de otro usuario. La clave vive solo en
 * Vercel y en los secrets de Supabase (regla 6).
 */
export function createAdminClient() {
  const { url } = publicEnv();
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Falta la variable de entorno SUPABASE_SECRET_KEY. Revisa .env.example.");
  }
  return createSupabaseClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
