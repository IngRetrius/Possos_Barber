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

/**
 * El idioma del dispositivo, a partir del encabezado `Accept-Language` del navegador
 * ("en-US,en;q=0.9,es;q=0.8"). Recorre los idiomas en el orden de preferencia (`q`) y devuelve el
 * primero que tiene la interfaz, sin mirar la región ("en-GB" es inglés, "es-MX" es español). Si
 * ninguno coincide, o no hay encabezado, el español.
 */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const ranked = acceptLanguage
    .split(",")
    .map((entry, index) => {
      const [tag = "", ...params] = entry.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const weight = q ? Number(q.slice(2)) : 1;
      return {
        language: tag.trim().toLowerCase().split("-")[0] ?? "",
        weight: Number.isFinite(weight) ? weight : 0,
        index,
      };
    })
    .filter((e) => e.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index);
  const match = ranked.find((e) => (LOCALES as readonly string[]).includes(e.language));
  return match ? (match.language as Locale) : DEFAULT_LOCALE;
}

/** Idioma de la interfaz por omisión y del atributo `lang`. */
export const LOCALE = HTML_LANG[DEFAULT_LOCALE];
