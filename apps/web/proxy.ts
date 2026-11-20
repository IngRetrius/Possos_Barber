import { NextResponse, type NextRequest } from "next/server";
import { copySessionCookies, updateSession } from "@possos/supabase/proxy";

/**
 * Proxy de Next 16 (antes middleware). Renueva la sesión de Supabase en cada página y manda a
 * ingresar a quien abre sin sesión una ruta que la exige.
 *
 * Solo mira si hay sesión: los roles (cliente, barbero, administrador) se deciden en el
 * servidor con is_admin() y current_barber_id() (`@possos/auth/server`), y cada página y cada
 * acción vuelve a verificar. El proxy es una primera barrera, no la única.
 *
 * Los pasos de la reserva (`/reservar`, `/reservar/horario`, `/reservar/confirmar`) no exigen
 * sesión: la cuenta se pide en "Confirmar" (docs/11, decisión 5).
 */
const NEEDS_SESSION = [
  "/perfil",
  "/mis-citas",
  "/panel",
  "/completar-perfil",
  "/nueva-contrasena",
  "/reservar/listo",
];

export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (!userId && NEEDS_SESSION.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = "/ingresar";
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);
    return copySessionCookies(response, NextResponse.redirect(url));
  }
  return response;
}

export const config = {
  // Todo menos archivos estáticos e imágenes, y lo de la PWA que no depende de la sesión: el
  // service worker, el manifiesto, la pantalla sin conexión (la misma copia sirve a cualquier
  // cuenta), la ruta de despacho que llama la base (F8) y el webhook de WhatsApp que llama Meta
  // (F7).
  matcher: [
    "/((?!_next/static|_next/image|icons/|serwist/|api/notifications/|api/whatsapp/|manifest.webmanifest|sin-conexion|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml)$).*)",
  ],
};
