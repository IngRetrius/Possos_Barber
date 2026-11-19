import { NextResponse, type NextRequest } from "next/server";
import { AUTH_ROUTES, safeNext, withNext } from "@possos/auth";
import { exchangeCode, getViewer } from "@possos/auth/server";
import { createClient } from "@possos/supabase/server";
import { destinationAfterSignIn } from "../../../../lib/session";

/**
 * Vuelta con un código PKCE (`?code=`), de dos lados:
 *
 * - Google (sin `via`).
 * - Un correo con la plantilla de Supabase (`via=correo`): activar la cuenta o cambiar la
 *   contraseña. Supabase ya verificó el enlace antes de mandar aquí.
 *
 * El verificador de PKCE está en una cookie del navegador que empezó el ingreso. Si la vuelta
 * llega a otro navegador (la PWA de iOS que abre Safari, riesgo 6; o el correo abierto en
 * otro celular), el cambio falla. Con Google se vuelve a ingresar con un aviso. Con el correo
 * de activación la cuenta ya quedó activada: se pide ingresar con la contraseña.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const fromEmail = searchParams.get("via") === "correo";
  const recovery = next?.startsWith(AUTH_ROUTES.newPassword) ?? false;
  const code = searchParams.get("code");
  const go = (path: string) => NextResponse.redirect(new URL(path, origin));

  const failed = () => {
    if (!fromEmail) return go(withNext(`${AUTH_ROUTES.signIn}?error=google`, next));
    if (recovery) return go(`${AUTH_ROUTES.resetPassword}?error=navegador`);
    // Sin código, Supabase no pudo verificar el enlace (vencido o ya usado).
    if (!code) return go(withNext(`${AUTH_ROUTES.signIn}?error=enlace`, next));
    return go(withNext(`${AUTH_ROUTES.signIn}?aviso=cuenta-activada`, next));
  };

  if (!code) return failed();
  const db = await createClient();
  const exchanged = await exchangeCode(db, code);
  if (!exchanged.ok) return failed();

  if (recovery && next) return go(next);
  const viewer = await getViewer(db);
  if (!viewer) return failed();
  return go(await destinationAfterSignIn(db, viewer, next));
}
