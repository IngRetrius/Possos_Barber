import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";
import { publicEnv } from "./env";

export interface SessionUpdate {
  /** La respuesta que debe devolver el proxy: lleva las cookies de la sesión renovada. */
  response: NextResponse;
  /** Usuario de la sesión, verificado (`getClaims`), o null si no hay sesión válida. */
  userId: string | null;
}

/**
 * Renueva la sesión de Supabase en el proxy de Next (`apps/web/proxy.ts`, antes middleware).
 * Los Server Components no pueden escribir cookies; por eso la renovación pasa aquí.
 *
 * Si el proxy decide redirigir, debe copiar las cookies de `response` en la redirección
 * (`copySessionCookies`); si no, la sesión renovada se pierde y el usuario sale.
 */
export async function updateSession(request: NextRequest): Promise<SessionUpdate> {
  const { url, publishableKey } = publicEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // Cabeceras que impiden que una CDN guarde la respuesta con las cookies de otra persona.
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
      },
    },
  });

  // Nada entre createServerClient y getClaims: getClaims es lo que renueva el token vencido.
  const { data } = await supabase.auth.getClaims();
  return { response, userId: data?.claims?.sub ?? null };
}

/** Pasa las cookies de la sesión renovada a otra respuesta (una redirección). */
export function copySessionCookies(from: NextResponse, to: NextResponse): NextResponse {
  for (const cookie of from.cookies.getAll()) to.cookies.set(cookie);
  for (const key of ["cache-control", "expires", "pragma"]) {
    const value = from.headers.get(key);
    if (value) to.headers.set(key, value);
  }
  return to;
}
