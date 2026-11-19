/*
 * Formulario de un servicio en el panel del administrador. La base valida otra vez
 * (duración múltiplo de 5 y precio no negativo). No importa ./index para evitar un ciclo.
 */

export const MAX_SERVICE_NAME = 60;
export const MAX_SERVICE_DESCRIPTION = 300;

export interface ServiceFormInput {
  name: string;
  description: string;
  durationMin: string;
  /** Vacío: precio [PENDIENTE]. Acepta "30.000", "30000" o "$ 30.000". */
  priceCop: string;
}

export interface ValidService {
  name: string;
  description: string | null;
  duration_min: number;
  price_cop: number | null;
}

export type ServiceField = "name" | "description" | "durationMin" | "priceCop";
export type ServiceErrors = Partial<Record<ServiceField, string>>;

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
  if (!name) errors.name = "Escribe el nombre del servicio";
  else if (name.length > MAX_SERVICE_NAME) errors.name = `Máximo ${MAX_SERVICE_NAME} caracteres`;
  const description = input.description.trim();
  if (description.length > MAX_SERVICE_DESCRIPTION) {
    errors.description = `Máximo ${MAX_SERVICE_DESCRIPTION} caracteres`;
  }
  const duration = Number(input.durationMin);
  if (!Number.isInteger(duration) || duration <= 0 || duration % 5 !== 0 || duration > 480) {
    errors.durationMin = "Escribe los minutos en múltiplos de 5 (por ejemplo, 60)";
  }
  const price = parsePesos(input.priceCop);
  if (price !== null && (!Number.isSafeInteger(price) || price < 0)) {
    errors.priceCop = "Escribe el precio en pesos, sin centavos (por ejemplo, 30.000)";
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    data: { name, description: description || null, duration_min: duration, price_cop: price },
  };
}
