import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_ROUTES, withNext, type Viewer } from "@possos/auth";
import { requireViewer } from "@possos/auth/server";
import { needsConsent, type Customer } from "@possos/customers";
import { getMyProfile } from "@possos/customers/server";
import type { DbClient } from "@possos/supabase";

/*
 * Composición de auth y customers: a dónde va cada quien después de ingresar. Vive en la app
 * porque auth no conoce a customers (docs/08).
 */

/** Inicio del cliente con sesión. Pasa a "Mis citas" en F5. */
export const CUSTOMER_HOME = "/perfil";
export const STAFF_HOME = "/panel";
export const COMPLETE_PROFILE = "/completar-perfil";

/**
 * Destino después de ingresar (con correo, Google o el enlace del correo):
 *
 * - Personal (admin o barbero): `next` o el panel. No necesita perfil de cliente.
 * - Cliente sin perfil, o con la autorización de una versión vieja de la política: completar
 *   el perfil, y después `next`.
 * - Cliente con perfil: `next` o su inicio.
 */
export async function destinationAfterSignIn(
  db: DbClient,
  viewer: Viewer,
  next: string | null,
): Promise<string> {
  if (viewer.isStaff) return next ?? STAFF_HOME;
  const profile = await getMyProfile(db, viewer.userId);
  if (profile.ok && needsConsent(profile.data)) {
    return withNext(COMPLETE_PROFILE, next ?? CUSTOMER_HOME);
  }
  return next ?? CUSTOMER_HOME;
}

/**
 * Exige un cliente con perfil completo. `path` es la ruta actual, para volver a ella después
 * de ingresar o de completar el perfil.
 */
export async function requireCustomer(
  db: DbClient,
  path: string,
): Promise<{ viewer: Viewer; profile: Customer }> {
  const viewer = await requireViewer(db, path);
  const profile = await getMyProfile(db, viewer.userId);
  if (!profile.ok) throw new Error(`No se pudo leer el perfil: ${profile.error}`);
  if (!profile.data || needsConsent(profile.data)) redirect(withNext(COMPLETE_PROFILE, path));
  return { viewer, profile: profile.data };
}

/**
 * Origen del sitio para los enlaces que vuelven de Supabase (correo y Google). Supabase solo
 * redirige a URL de su lista de redirecciones permitidas, así que un origen falso no sirve.
 */
export async function siteOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Ruta de ingreso con `next`. */
export function signInPath(next: string | null): string {
  return withNext(AUTH_ROUTES.signIn, next);
}

/** Primer valor de un parámetro de búsqueda. */
export function param(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
