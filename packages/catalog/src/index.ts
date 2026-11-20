/**
 * API pública de @possos/catalog: servicios: consultas, acciones y componentes.
 * Solo se exporta lo que otros módulos necesitan. Lo interno va en src/internal/ (docs/08).
 *
 * - `@possos/catalog`: tipos y formato del precio.
 * - `@possos/catalog/server`: leer los servicios activos.
 * - `@possos/catalog/ui`: la lista de servicios (página pública y paso "Servicio").
 */
import type { Tables } from "@possos/supabase";

/** Un servicio. `price_cop` es null mientras el dueño no confirme el precio ([PENDIENTE]). */
export type Service = Tables<"services">;

export { PENDING, PENDING_LABEL, servicePriceLabel } from "./internal/price";
export {
  MAX_SERVICE_DESCRIPTION,
  MAX_SERVICE_NAME,
  parsePesos,
  validateService,
  type ServiceError,
  type ServiceErrors,
  type ServiceField,
  type ServiceFormInput,
  type ValidService,
} from "./internal/service-form";
