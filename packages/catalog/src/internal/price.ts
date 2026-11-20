import { DEFAULT_LOCALE, type Locale } from "@possos/config/constants";
import { formatPrice } from "@possos/ui";

/** Texto de un dato del negocio que el dueño todavía no confirma (regla 8 de CLAUDE.md). */
export const PENDING_LABEL: Record<Locale, string> = { es: "[PENDIENTE]", en: "[PENDING]" };

/** "[PENDIENTE]" en español. */
export const PENDING = PENDING_LABEL.es;

/** "$30.000" o "[PENDIENTE]" si el precio es null, en el idioma de la persona. */
export function servicePriceLabel(
  priceCop: number | null,
  locale: Locale = DEFAULT_LOCALE,
): string {
  return priceCop === null ? PENDING_LABEL[locale] : formatPrice(priceCop, locale);
}
