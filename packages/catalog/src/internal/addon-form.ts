/*
 * Formulario de un adicional en el panel del administrador. La base valida otra vez (minutos
 * múltiplos de 5 y precio no negativo). No importa ./index para evitar un ciclo.
 */
import { parsePesos } from "./service-form";

export const MAX_ADDON_NAME = 40;

export interface AddonFormInput {
  name: string;
  /** Minutos que suma. Vacío o 0: se hace en el mismo tiempo del servicio. */
  durationMin: string;
  /** Vacío: precio [PENDIENTE]. Acepta "5.000", "5000" o "$ 5.000". */
  priceCop: string;
}

export interface ValidAddon {
  name: string;
  duration_min: number;
  price_cop: number | null;
}

export type AddonField = "name" | "durationMin" | "priceCop";
/** Clave del error; el formulario la traduce (`catalog.addonForm.errors`). */
export type AddonError = "nameRequired" | "nameTooLong" | "durationInvalid" | "priceInvalid";
export type AddonErrors = Partial<Record<AddonField, AddonError>>;

export function validateAddon(
  input: AddonFormInput,
): { ok: true; data: ValidAddon } | { ok: false; errors: AddonErrors } {
  const errors: AddonErrors = {};
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name) errors.name = "nameRequired";
  else if (name.length > MAX_ADDON_NAME) errors.name = "nameTooLong";
  const durationText = input.durationMin.trim();
  const duration = durationText === "" ? 0 : Number(durationText);
  if (!Number.isInteger(duration) || duration < 0 || duration % 5 !== 0 || duration > 480) {
    errors.durationMin = "durationInvalid";
  }
  const price = parsePesos(input.priceCop);
  if (price !== null && (!Number.isSafeInteger(price) || price < 0)) {
    errors.priceCop = "priceInvalid";
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: { name, duration_min: duration, price_cop: price } };
}
