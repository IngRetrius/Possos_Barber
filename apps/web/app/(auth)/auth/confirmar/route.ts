import { NextResponse, type NextRequest } from "next/server";
import { AUTH_ROUTES, safeNext, withNext } from "@possos/auth";
import { getViewer, verifyEmailLink } from "@possos/auth/server";
import { createClient } from "@possos/supabase/server";
import { destinationAfterSignIn } from "../../../../lib/session";

/**
 * Enlace de los correos de Supabase (supabase/templates): activar la cuenta (`type=email`) o
 * cambiar la contraseña (`type=recovery`). Verifica el token, abre la sesión y sigue.
 *
 * El token viaja en el enlace y no depende de una cookie, así que funciona aunque el correo se
 * abra en otro navegador o en otro celular. `next` llega como URL absoluta (`RedirectTo`); solo
 * se acepta si es de este mismo sitio.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = safeNext(searchParams.get("next"), origin);

  if (!tokenHash || (type !== "email" && type !== "recovery")) {
    return NextResponse.redirect(new URL(`${AUTH_ROUTES.signIn}?error=enlace`, origin));
  }

  const db = await createClient();
  const verified = await verifyEmailLink(db, { tokenHash, type });
  if (!verified.ok) {
    const retry =
      type === "recovery"
        ? `${AUTH_ROUTES.resetPassword}?error=enlace`
        : withNext(`${AUTH_ROUTES.signIn}?error=enlace`, next);
    return NextResponse.redirect(new URL(retry, origin));
  }

  if (type === "recovery") {
    const target = next?.startsWith(AUTH_ROUTES.newPassword) ? next : AUTH_ROUTES.newPassword;
    return NextResponse.redirect(new URL(target, origin));
  }

  const viewer = await getViewer(db);
  if (!viewer) return NextResponse.redirect(new URL(`${AUTH_ROUTES.signIn}?error=enlace`, origin));
  return NextResponse.redirect(new URL(await destinationAfterSignIn(db, viewer, next), origin));
}
