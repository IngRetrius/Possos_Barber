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

/** Proveedores de ingreso activos en Supabase Auth (`/auth/v1/settings`). */
export interface AuthSettings {
  external: Record<string, boolean>;
  disable_signup: boolean;
}

/**
 * Configuración pública de Supabase Auth: qué proveedores están activos. Se guarda 5 minutos.
 * Si no responde, devuelve null y quien llama decide qué mostrar.
 */
export async function getAuthSettings(): Promise<AuthSettings | null> {
  const { url, publishableKey } = publicEnv();
  try {
    // `next.revalidate` es una opción de Next; sus tipos solo se cargan dentro de la app.
    const init: RequestInit & { next: { revalidate: number } } = {
      headers: { apikey: publishableKey },
      next: { revalidate: 300 },
    };
    const response = await fetch(`${url}/auth/v1/settings`, init);
    if (!response.ok) return null;
    return (await response.json()) as AuthSettings;
  } catch {
    return null;
  }
}
