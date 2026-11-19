/** Códigos estables que lanzan las funciones de Postgres del módulo booking (docs/09). */
export const BOOKING_ERROR_CODES = [
  "SLOT_TAKEN",
  "TOO_LATE_TO_CANCEL",
  "OUTSIDE_WORKING_HOURS",
  "IN_TIME_OFF",
  "TOO_SOON",
  "TOO_FAR",
  "SERVICE_NOT_AVAILABLE",
  "NO_CUSTOMER_PROFILE",
  "NOT_AUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "INVALID_STATUS",
  "INVALID_INPUT",
  "INVALID_PERIOD",
  "REASON_REQUIRED",
  "NOT_STARTED",
] as const;

export type BookingErrorCode = (typeof BOOKING_ERROR_CODES)[number] | "UNKNOWN";

/** Textos de docs/11 (sección "Textos de la interfaz"), en tuteo y sin emojis. */
const MESSAGES: Record<BookingErrorCode, string> = {
  SLOT_TAKEN: "Esa hora se acaba de ocupar, elige otra",
  TOO_LATE_TO_CANCEL: "Ya no puedes cambiarla desde aquí. Escríbele al barbero",
  OUTSIDE_WORKING_HOURS: "Esa hora está fuera del horario del barbero",
  IN_TIME_OFF: "El barbero no atiende a esa hora",
  TOO_SOON: "Esa hora ya no se puede reservar. Elige una más tarde",
  TOO_FAR: "Esa fecha todavía no está abierta para reservas",
  SERVICE_NOT_AVAILABLE: "Ese servicio no está disponible con ese barbero",
  NO_CUSTOMER_PROFILE: "Completa tu perfil para reservar",
  NOT_AUTHENTICATED: "Ingresa para continuar",
  FORBIDDEN: "No tienes permiso para hacer esto",
  NOT_FOUND: "No encontramos esa cita",
  INVALID_STATUS: "Esa cita ya no se puede cambiar",
  INVALID_INPUT: "Revisa los datos e intenta de nuevo",
  INVALID_PERIOD: "Revisa las fechas: el final debe ser después del inicio",
  REASON_REQUIRED: "Escribe el motivo",
  NOT_STARTED: "Todavía no es la hora de la cita",
  UNKNOWN: "No pudimos completar la acción. Intenta de nuevo",
};

/** Texto en español para mostrar al usuario. */
export function bookingErrorMessage(code: BookingErrorCode): string {
  return MESSAGES[code];
}
