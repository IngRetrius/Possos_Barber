/*
 * Formulario de un servicio en el panel del administrador. La base valida otra vez
 * (duración múltiplo de 5 y precio no negativo). No importa ./index para evitar un ciclo.
 */

export const MAX_SERVICE_NAME = 60;
export const MAX_SERVICE_DESCRIPTION = 300;
export const MAX_SERVICE_CATEGORY = 40;

export interface ServiceFormInput {
  name: string;
  description: string;
  durationMin: string;
  /** Vacío: precio [PENDIENTE]. Acepta "30.000", "30000" o "$ 30.000". */
  priceCop: string;
  /** Grupo en el inicio ("Color de cabello"). Vacío: el servicio va solo. */
  category: string;
}

export interface ValidService {
  name: string;
  description: string | null;
  duration_min: number;
  price_cop: number | null;
  category: string | null;
}

export type ServiceField = "name" | "description" | "durationMin" | "priceCop" | "category";
/** Clave del error; el formulario la traduce (`catalog.serviceForm.errors`). */
export type ServiceError =
  | "nameRequired"
  | "nameTooLong"
  | "descriptionTooLong"
  | "durationInvalid"
  | "priceInvalid"
  | "categoryTooLong";
export type ServiceErrors = Partial<Record<ServiceField, ServiceError>>;

/** "$ 30.000" → 30000. Vacío → null. Lo que no es un número entero → NaN. */
export function parsePesos(value: string): number | null {
  const text = value.replace(/[\s$]/g, "");
  if (!text) return null;
  if (!/^\d{1,3}(\.\d{3})*$|^\d+$/.test(text)) return Number.NaN;
  return Number(text.replace(/\./g, ""));
}

export function validateService(
  input: ServiceFormInput,
): { ok: true; data: ValidService } | { ok: false; errors: ServiceErrors } {
  const errors: ServiceErrors = {};
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name) errors.name = "nameRequired";
  else if (name.length > MAX_SERVICE_NAME) errors.name = "nameTooLong";
  const description = input.description.trim();
  if (description.length > MAX_SERVICE_DESCRIPTION) errors.description = "descriptionTooLong";
  const duration = Number(input.durationMin);
  if (!Number.isInteger(duration) || duration <= 0 || duration % 5 !== 0 || duration > 480) {
    errors.durationMin = "durationInvalid";
  }
  const price = parsePesos(input.priceCop);
  if (price !== null && (!Number.isSafeInteger(price) || price < 0)) {
    errors.priceCop = "priceInvalid";
  }
  const category = input.category.trim().replace(/\s+/g, " ");
  if (category.length > MAX_SERVICE_CATEGORY) errors.category = "categoryTooLong";
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      name,
      description: description || null,
      duration_min: duration,
      price_cop: price,
      category: category || null,
    },
  };
}
