import { useLocale } from "next-intl";
import { parseLocale } from "@possos/config/constants";
import { formatters, type Formatters } from "./format";

/**
 * Formatos de fecha, hora y precio en el idioma de la persona. Sirve en componentes de servidor y
 * de cliente (next-intl entrega el idioma a los dos).
 */
export function useFormat(): Formatters {
  return formatters(parseLocale(useLocale()));
}
