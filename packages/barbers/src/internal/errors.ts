/** Códigos que lanzan las funciones de Postgres del módulo barbers. */
export const BARBERS_ERROR_CODES = [
  "NOT_AUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "INVALID_PERIOD",
  "TIME_OFF_OVERLAP",
  "HOURS_OVERLAP",
  "INVALID_INPUT",
  "ALREADY_LINKED",
] as const;

export type BarbersErrorCode = (typeof BARBERS_ERROR_CODES)[number] | "UNKNOWN";

const MESSAGES: Record<BarbersErrorCode, string> = {
  NOT_AUTHENTICATED: "Ingresa para continuar",
  FORBIDDEN: "No tienes permiso para hacer esto",
  NOT_FOUND: "No encontramos ese barbero",
  INVALID_PERIOD: "Revisa las fechas: el final debe ser después del inicio",
  TIME_OFF_OVERLAP: "Ya tienes un bloqueo en ese horario",
  HOURS_OVERLAP: "Dos rangos del mismo día se cruzan. Revisa las horas",
  INVALID_INPUT: "Revisa los datos e intenta de nuevo",
  ALREADY_LINKED: "Esa cuenta ya tiene otro perfil de barbero",
  UNKNOWN: "No pudimos completar la acción. Intenta de nuevo",
};

/** Texto en español para mostrar al usuario (docs/11). */
export function barbersErrorMessage(code: BarbersErrorCode): string {
  return MESSAGES[code];
}
