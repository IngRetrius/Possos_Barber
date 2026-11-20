/**
 * API pública de @possos/customers: clientes, notas e inasistencias.
 * Solo se exporta lo que otros módulos necesitan. Lo interno va en src/internal/ (docs/08).
 *
 * - `@possos/customers`: tipos, validación del perfil y del celular, versión de la política.
 * - `@possos/customers/server`: leer y guardar el perfil propio.
 * - `@possos/customers/ui`: formulario del perfil.
 *
 * Un barbero solo ve a los clientes con barber_customers con él (docs/06). El teléfono de un
 * cliente nunca se muestra a otro cliente (regla 7).
 */
import type { Tables } from "@possos/supabase";
import type { ProfileErrors } from "./internal/profile";

export type Customer = Tables<"customers">;
export type BarberCustomer = Tables<"barber_customers">;
export type CustomerNote = Tables<"customer_notes">;

/** Estado que devuelve la acción del formulario del perfil (`useActionState`). */
export interface ProfileFormState {
  /** Error general, ya en español. */
  error?: string;
  fieldErrors?: ProfileErrors;
  /** Se guardó (al editar; al completar, la acción redirige). */
  saved?: boolean;
}

export {
  formatPhone,
  normalizePhoneDigits,
  parseColombianMobile,
  phoneErrorMessage,
  type ParsedPhone,
  type PhoneError,
} from "./internal/phone";
export {
  DATA_POLICY_VERSION,
  MAX_NAME_LENGTH,
  needsConsent,
  validateProfile,
  type ProfileError,
  type ProfileErrors,
  type ProfileField,
  type ProfileInput,
  type ValidProfile,
} from "./internal/profile";
export {
  CUSTOMERS_ERROR_CODES,
  customersErrorMessage,
  type CustomersErrorCode,
} from "./internal/errors";
export {
  searchTerm,
  validateStaffCustomer,
  whatsappChatUrl,
  type StaffCustomerErrors,
  type StaffCustomerField,
  type StaffCustomerInput,
  type ValidStaffCustomer,
} from "./internal/staff";
