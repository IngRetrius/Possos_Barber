import { DEFAULT_LOCALE, type Locale } from "@possos/config/constants";
import { messages } from "../messages";

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

/** Texto para mostrar al usuario, en su idioma. Nunca dice "factura" (CLAUDE.md). */
export function commissionsErrorMessage(
  code: CommissionsErrorCode,
  locale: Locale = DEFAULT_LOCALE,
): string {
  return messages[locale].errors[code];
}
