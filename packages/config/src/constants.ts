/**
 * Constantes compartidas por todos los módulos.
 * Todo se guarda en UTC (`timestamptz`) y se muestra en la hora de Bogotá (docs/07-stack.md).
 */

/** Zona horaria de la barbería. Colombia no tiene horario de verano: siempre UTC-5. */
export const TIMEZONE = "America/Bogota";

/**
 * Idiomas de la interfaz (docs/11, "Idiomas"). El español es el de siempre; el inglés es una
 * traducción para quien no lee español. El primero es el idioma por omisión.
 */
export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "es";

/** Cookie con el idioma que eligió la persona (la lee next-intl en cada petición). */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Atributo `lang` del documento para cada idioma. */
export const HTML_LANG: Record<Locale, string> = { es: "es-CO", en: "en" };

/** El idioma de un texto cualquiera (una cookie, un parámetro), o el de omisión. */
export function parseLocale(value: string | null | undefined): Locale {
  return (LOCALES as readonly string[]).includes(value ?? "") ? (value as Locale) : DEFAULT_LOCALE;
}

/** Idioma de la interfaz por omisión y del atributo `lang`. */
export const LOCALE = HTML_LANG[DEFAULT_LOCALE];
