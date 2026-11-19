/** Códigos que lanzan las funciones de Postgres del módulo barbers. */
export const BARBERS_ERROR_CODES = [
  "NOT_AUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "INVALID_PERIOD",
  "TIME_OFF_OVERLAP",
] as const;

export type BarbersErrorCode = (typeof BARBERS_ERROR_CODES)[number] | "UNKNOWN";

const MESSAGES: Record<BarbersErrorCode, string> = {
  NOT_AUTHENTICATED: "Ingresa para continuar",
  FORBIDDEN: "No tienes permiso para hacer esto",
  NOT_FOUND: "No encontramos ese barbero",
  INVALID_PERIOD: "Revisa las fechas: el final debe ser después del inicio",
  TIME_OFF_OVERLAP: "Ya tienes un bloqueo en ese horario",
  UNKNOWN: "No pudimos completar la acción. Intenta de nuevo",
};

/** Texto en español para mostrar al usuario (docs/11). */
export function barbersErrorMessage(code: BarbersErrorCode): string {
  return MESSAGES[code];
}
