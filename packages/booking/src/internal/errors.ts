import { DEFAULT_LOCALE, type Locale } from "@possos/config/constants";
import { messages } from "../messages";

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

/** Texto para mostrar al usuario, en su idioma (docs/11, "Textos de la interfaz"). */
export function bookingErrorMessage(
  code: BookingErrorCode,
  locale: Locale = DEFAULT_LOCALE,
): string {
  return messages[locale].errors[code];
}
