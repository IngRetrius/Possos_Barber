import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { publicEnv } from "./env";

/**
 * Cliente para Server Components, Server Actions y rutas. Actúa como el usuario de la sesión
 * y respeta RLS. Se crea uno por petición; no se comparte entre peticiones.
 */
export async function createClient() {
  const { url, publishableKey } = publicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Un Server Component no puede escribir cookies. El proxy de Next refresca la sesión (F3).
        }
      },
    },
  });
}
