/**
 * El parámetro `next`: a dónde vuelve el cliente después de ingresar (por ejemplo, al resumen
 * de "Confirmar" con lo que había elegido). Solo se aceptan rutas internas; si no, cualquiera
 * podría mandar un enlace de ingreso que termine en otro sitio (redirección abierta).
 */

/** Rutas de ingreso: volver a ellas después de ingresar sería un bucle. */
const AUTH_PATHS = ["/ingresar", "/registrarse", "/recuperar-contrasena", "/auth"];

const MAX_LENGTH = 2048;
const INTERNAL = "http://possos.invalid";

/**
 * Devuelve la ruta (con su consulta y su ancla) si es interna y segura, o null.
 *
 * - Acepta `/reservar?servicio=1`.
 * - Con `origin`, acepta también una URL absoluta de ese mismo origen: el enlace del correo de
 *   confirmación trae `next` así (ver supabase/templates).
 * - Rechaza `//otro.com`, `/\otro.com`, `https://otro.com`, `javascript:` y las rutas de ingreso.
 */
export function safeNext(value: unknown, origin?: string): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw || raw.length > MAX_LENGTH) return null;

  let url: URL;
  try {
    if (raw.startsWith("/")) {
      // El analizador de URL toma "\" como "/" y quita tabulaciones y saltos de línea, así que
      // "/\otro.com" o "/\t/otro.com" terminan en otro origen; la comparación los descarta.
      url = new URL(raw, INTERNAL);
      if (url.origin !== INTERNAL) return null;
    } else if (origin) {
      url = new URL(raw);
      if (url.origin !== new URL(origin).origin) return null;
    } else {
      return null;
    }
  } catch {
    return null;
  }

  const path = url.pathname;
  if (AUTH_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) return null;
  return `${path}${url.search}${url.hash}`;
}

/** Agrega `?next=` a una ruta, si hay a dónde volver. */
export function withNext(path: string, next: string | null | undefined): string {
  const safe = safeNext(next);
  if (!safe) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}next=${encodeURIComponent(safe)}`;
}
