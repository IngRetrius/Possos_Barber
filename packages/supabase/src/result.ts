/** Resultado de una operación de la base: los datos o un código de error estable. */
export type Result<T, E extends string> = { ok: true; data: T } | { ok: false; error: E };

/**
 * Las funciones de Postgres lanzan sus errores con el código en el mensaje (`SLOT_TAKEN`, ...).
 * Devuelve ese código si es uno de los esperados, o `UNKNOWN`.
 */
export function errorCode<C extends string>(
  error: { message?: string | null } | null | undefined,
  codes: readonly C[],
): C | "UNKNOWN" {
  const message = error?.message?.trim();
  return message && (codes as readonly string[]).includes(message) ? (message as C) : "UNKNOWN";
}
