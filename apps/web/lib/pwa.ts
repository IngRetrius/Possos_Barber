/**
 * Constantes de la PWA que comparten el service worker (`app/sw.ts`) y las páginas. Sin React
 * ni código de servidor: esbuild lo empaqueta dentro del worker.
 */

/** La ruta de Serwist (`app/serwist/[path]/route.ts`) sirve el worker compilado aquí. */
export const SW_URL = "/serwist/sw.js";

/** Pantalla que se muestra al navegar sin conexión a algo que no está guardado. */
export const OFFLINE_PATH = "/sin-conexion";

/** Cáscara: la pantalla sin conexión. Se vuelve a guardar con cada versión del worker. */
export const SHELL_CACHE = "possos-cascara";

/**
 * Páginas con datos de un cliente que se guardan para verlas sin conexión: "Mis citas" y cada
 * cita. Se borran al cerrar sesión o al cambiar de cuenta en el mismo navegador (regla 7; ver
 * `app/_components/offline-cache.ts`).
 */
export const PRIVATE_CACHE = "possos-privado";

const OFFLINE_ROUTES = [/^\/mis-citas$/, /^\/mis-citas\/[0-9a-f-]{36}$/];

export function isOfflineRoute(pathname: string): boolean {
  return OFFLINE_ROUTES.some((route) => route.test(pathname));
}

/** La clave de la caché: sin la consulta (`?aviso=cambiada` es la misma página). */
export function offlineCacheKey(url: string): string {
  const parsed = new URL(url);
  parsed.search = "";
  parsed.hash = "";
  return parsed.href;
}

/** Mensaje de la página al worker que espera: "activa la versión nueva". */
export const SKIP_WAITING = "SKIP_WAITING";
