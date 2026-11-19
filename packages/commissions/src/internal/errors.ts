/** Códigos que lanzan las funciones de Postgres del módulo commissions. */
export const COMMISSIONS_ERROR_CODES = [
  "NOT_AUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "NOT_COMPLETED",
  "ALREADY_CHARGED",
  "INVALID_AMOUNT",
  "NO_COMMISSION_RATE",
  "TOO_LATE_TO_EDIT",
  "INVALID_STATUS",
  "INVALID_PERIOD",
  "REASON_REQUIRED",
] as const;

export type CommissionsErrorCode = (typeof COMMISSIONS_ERROR_CODES)[number] | "UNKNOWN";

/** En la interfaz no se dice "factura": no es factura electrónica de la DIAN (CLAUDE.md). */
const MESSAGES: Record<CommissionsErrorCode, string> = {
  NOT_AUTHENTICATED: "Ingresa para continuar",
  FORBIDDEN: "No tienes permiso para hacer esto",
  NOT_FOUND: "No encontramos ese cobro",
  NOT_COMPLETED: "Primero marca que el cliente vino",
  ALREADY_CHARGED: "Esta cita ya tiene un cobro",
  INVALID_AMOUNT: "Escribe un valor válido",
  NO_COMMISSION_RATE: "Falta definir el porcentaje de este barbero",
  TOO_LATE_TO_EDIT: "Solo puedes corregir los cobros del mismo día",
  INVALID_STATUS: "Este cobro está anulado",
  INVALID_PERIOD: "Revisa las fechas: el final debe ser después del inicio",
  REASON_REQUIRED: "Escribe el motivo",
  UNKNOWN: "No pudimos completar la acción. Intenta de nuevo",
};

/** Texto en español para mostrar al usuario. */
export function commissionsErrorMessage(code: CommissionsErrorCode): string {
  return MESSAGES[code];
}
