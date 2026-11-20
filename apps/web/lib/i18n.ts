import "server-only";
import { getLocale } from "next-intl/server";
import { parseLocale, type Locale } from "@possos/config/constants";
import { formatters } from "@possos/ui";

/** Idioma de la petición (cookie del botón ES/EN), para acciones, rutas y páginas del servidor. */
export async function currentLocale(): Promise<Locale> {
  return parseLocale(await getLocale());
}

/** Formatos de fecha, hora y precio en el idioma de la petición. */
export async function currentFormatters() {
  return formatters(await currentLocale());
}
