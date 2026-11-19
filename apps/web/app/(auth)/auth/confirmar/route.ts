import { NextResponse, type NextRequest } from "next/server";
import { AUTH_ROUTES, safeNext, withNext } from "@possos/auth";
import { getViewer, verifyEmailLink } from "@possos/auth/server";
import { createClient } from "@possos/supabase/server";
import { destinationAfterSignIn } from "../../../../lib/session";

/**
 * Enlace de las plantillas propias de correo (supabase/templates): activar la cuenta
 * (`type=email`) o cambiar la contraseña (`type=recovery`). Verifica el token, abre la sesión
 * y sigue. El token viaja en el enlace y no depende de una cookie, así que funciona aunque el
 * correo se abra en otro navegador o en otro celular.
 *
 * Producción usa por ahora las plantillas de Supabase, que vuelven por /auth/callback (el plan
 * gratuito no deja cambiarlas sin SMTP propio; ver fases/F3-entrega.md).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = emailNext(searchParams.get("next"), origin);
  const go = (path: string) => NextResponse.redirect(new URL(path, origin));

  if (!tokenHash || (type !== "email" && type !== "recovery")) {
    return go(`${AUTH_ROUTES.signIn}?error=enlace`);
  }

  const db = await createClient();
  const verified = await verifyEmailLink(db, { tokenHash, type });
  if (!verified.ok) {
    return go(
      type === "recovery"
        ? `${AUTH_ROUTES.resetPassword}?error=enlace`
        : withNext(`${AUTH_ROUTES.signIn}?error=enlace`, next),
    );
  }

  if (type === "recovery") {
    return go(next?.startsWith(AUTH_ROUTES.newPassword) ? next : AUTH_ROUTES.newPassword);
  }

  const viewer = await getViewer(db);
  if (!viewer) return go(`${AUTH_ROUTES.signIn}?error=enlace`);
  return go(await destinationAfterSignIn(db, viewer, next));
}

/**
 * `next` llega como URL absoluta (`{{ .RedirectTo }}`), que apunta a /auth/callback con el
 * destino en su propio `next`. Se saca ese destino; solo se acepta si es de este mismo sitio.
 */
function emailNext(raw: string | null, origin: string): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw, origin);
    if (url.origin === origin && url.pathname === AUTH_ROUTES.oauthCallback) {
      return safeNext(url.searchParams.get("next"));
    }
  } catch {
    return null;
  }
  return safeNext(raw, origin);
}
