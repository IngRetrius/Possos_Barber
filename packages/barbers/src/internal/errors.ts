import { DEFAULT_LOCALE, type Locale } from "@possos/config/constants";
import { messages } from "../messages";

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

/** Texto para mostrar al usuario, en su idioma (docs/11). */
export function barbersErrorMessage(
  code: BarbersErrorCode,
  locale: Locale = DEFAULT_LOCALE,
): string {
  return messages[locale].errors[code];
}
