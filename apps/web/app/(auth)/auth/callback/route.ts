import { NextResponse, type NextRequest } from "next/server";
import { AUTH_ROUTES, safeNext, withNext } from "@possos/auth";
import { exchangeCode, getViewer } from "@possos/auth/server";
import { createClient } from "@possos/supabase/server";
import { destinationAfterSignIn } from "../../../../lib/session";

/**
 * Vuelta de Google (OAuth con PKCE). Cambia el código por la sesión y sigue al destino.
 * El verificador de PKCE está en una cookie del navegador que empezó el ingreso: si Google
 * vuelve a otro navegador (la PWA de iOS que abre Safari, riesgo 6), el cambio falla y se
 * vuelve a ingresar con un aviso.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const code = searchParams.get("code");
  const failed = () =>
    NextResponse.redirect(new URL(withNext(`${AUTH_ROUTES.signIn}?error=google`, next), origin));

  // Google devuelve ?error=access_denied si la persona cancela.
  if (!code) return failed();

  const db = await createClient();
  const exchanged = await exchangeCode(db, code);
  if (!exchanged.ok) return failed();

  const viewer = await getViewer(db);
  if (!viewer) return failed();
  return NextResponse.redirect(new URL(await destinationAfterSignIn(db, viewer, next), origin));
}
