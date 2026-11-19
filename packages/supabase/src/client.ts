import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { publicEnv } from "./env";

/** Cliente para componentes de navegador. Usa la sesión de las cookies y respeta RLS. */
export function createClient() {
  const { url, publishableKey } = publicEnv();
  return createBrowserClient<Database>(url, publishableKey);
}
