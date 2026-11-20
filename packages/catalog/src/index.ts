/**
 * API pública de @possos/catalog: servicios: consultas, acciones y componentes.
 * Solo se exporta lo que otros módulos necesitan. Lo interno va en src/internal/ (docs/08).
 *
 * - `@possos/catalog`: tipos, formato del precio y cuentas de los adicionales.
 * - `@possos/catalog/server`: leer los servicios y sus adicionales; el panel los cambia.
 * - `@possos/catalog/ui`: la lista de servicios, el selector de adicionales y sus formularios.
 */
import type { Tables } from "@possos/supabase";

/** Un servicio. `price_cop` es null mientras el dueño no confirme el precio ([PENDIENTE]). */
export type Service = Tables<"services">;

/** Un adicional de un servicio (barba, cejas): suma su precio y sus minutos a la cita. */
export type ServiceAddon = Tables<"service_addons">;

export {
  groupServices,
  pickAddons,
  serviceLabel,
  withAddons,
  type ServiceGroup,
  type ServiceTotal,
} from "./internal/addons";
export {
  MAX_ADDON_NAME,
  validateAddon,
  type AddonError,
  type AddonErrors,
  type AddonField,
  type AddonFormInput,
  type ValidAddon,
} from "./internal/addon-form";

export { PENDING, PENDING_LABEL, servicePriceLabel } from "./internal/price";
export {
  MAX_SERVICE_CATEGORY,
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
