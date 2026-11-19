/** Errores del perfil del cliente. Los de Postgres llegan como SQLSTATE (restricciones, RLS). */
export const CUSTOMERS_ERROR_CODES = [
  "NOT_AUTHENTICATED",
  "FORBIDDEN",
  "INVALID_CUSTOMER",
  "CONSENT_REQUIRED",
] as const;

export type CustomersErrorCode = (typeof CUSTOMERS_ERROR_CODES)[number] | "UNKNOWN";

/** Traduce un error de PostgREST o de una función de Postgres. */
export function customersErrorCode(
  error: { code?: string | null; message?: string | null } | null | undefined,
): CustomersErrorCode {
  if (!error) return "UNKNOWN";
  const message = error.message?.trim() ?? "";
  if ((CUSTOMERS_ERROR_CODES as readonly string[]).includes(message)) {
    return message as CustomersErrorCode;
  }
  // 23514: una restricción check (celular, nombre o customers_account_has_consent).
  if (error.code === "23514") return "INVALID_CUSTOMER";
  // 42501: RLS o privilegios de columna. 23505: ya existe un perfil para esa cuenta.
  if (error.code === "42501" || error.code === "23505") return "FORBIDDEN";
  return "UNKNOWN";
}

const MESSAGES: Record<CustomersErrorCode, string> = {
  NOT_AUTHENTICATED: "Ingresa para continuar",
  FORBIDDEN: "No tienes permiso para hacer esto",
  INVALID_CUSTOMER: "Revisa el nombre y el celular (+57 y 10 dígitos)",
  CONSENT_REQUIRED: "Sin esta autorización no podemos crear tu cuenta",
  UNKNOWN: "No pudimos completar la acción. Intenta de nuevo",
};

export function customersErrorMessage(code: CustomersErrorCode): string {
  return MESSAGES[code];
}
