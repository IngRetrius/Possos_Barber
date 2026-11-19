import { formatPrice } from "@possos/ui";

/** Texto de un dato del negocio que el dueño todavía no confirma (regla 8 de CLAUDE.md). */
export const PENDING = "[PENDIENTE]";

/** "$ 30.000" o "[PENDIENTE]" si el precio es null. */
export function servicePriceLabel(priceCop: number | null): string {
  return priceCop === null ? PENDING : formatPrice(priceCop);
}
