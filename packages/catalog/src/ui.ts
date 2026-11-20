/**
 * API pública de UI de @possos/catalog. La lista sirve en Server Components; el selector de
 * adicionales y los formularios son de cliente.
 */
export { AddonPicker, type AddonPickerProps } from "./internal/addon-picker";
export { serviceAnchor, ServiceList, type ServiceListProps } from "./internal/service-list";
export {
  ServiceForm,
  type ServiceAction,
  type ServiceFormProps,
  type ServiceFormState,
} from "./internal/service-form-view";
export {
  AddonForm,
  type AddonAction,
  type AddonFormProps,
  type AddonFormState,
} from "./internal/addon-form-view";
