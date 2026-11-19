/**
 * API pública de UI de @possos/catalog. Componentes sin estado: sirven en Server Components.
 */
export { ServiceList, type ServiceListProps } from "./internal/service-list";
export {
  ServiceForm,
  type ServiceAction,
  type ServiceFormProps,
  type ServiceFormState,
} from "./internal/service-form-view";
