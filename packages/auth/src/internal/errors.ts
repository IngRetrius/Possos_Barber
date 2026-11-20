/**
 * Errores de ingreso, registro y cuenta. Supabase Auth responde con su propio código
 * (`invalid_credentials`, `otp_expired`...); aquí se agrupan en los casos que la interfaz
 * distingue. `delete_my_account` lanza `NOT_AUTHENTICATED` o `FORBIDDEN` como las demás
 * funciones de Postgres.
 */
export const AUTH_ERROR_CODES = [
  "INVALID_CREDENTIALS",
  "EMAIL_NOT_CONFIRMED",
  "INVALID_EMAIL",
  "WEAK_PASSWORD",
  "SAME_PASSWORD",
  "LINK_EXPIRED",
  "GOOGLE_FAILED",
  "RATE_LIMITED",
  "NOT_AUTHENTICATED",
  "FORBIDDEN",
  // Roles desde el panel (F6): grant_role y revoke_role.
  "USER_NOT_FOUND",
  "CANNOT_REVOKE_SELF",
  "INVALID_INPUT",
] as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number] | "UNKNOWN";

/** Contraseña mínima. En local la fija supabase/config.toml; en producción, el panel de Supabase. */
export const MIN_PASSWORD_LENGTH = 8;

const FROM_SUPABASE: Record<string, AuthErrorCode> = {
  invalid_credentials: "INVALID_CREDENTIALS",
  email_not_confirmed: "EMAIL_NOT_CONFIRMED",
  email_address_invalid: "INVALID_EMAIL",
  validation_failed: "INVALID_EMAIL",
  weak_password: "WEAK_PASSWORD",
  same_password: "SAME_PASSWORD",
  otp_expired: "LINK_EXPIRED",
  flow_state_expired: "LINK_EXPIRED",
  flow_state_not_found: "LINK_EXPIRED",
  bad_code_verifier: "LINK_EXPIRED",
  bad_oauth_state: "GOOGLE_FAILED",
  bad_oauth_callback: "GOOGLE_FAILED",
  provider_disabled: "GOOGLE_FAILED",
  oauth_provider_not_supported: "GOOGLE_FAILED",
  over_request_rate_limit: "RATE_LIMITED",
  over_email_send_rate_limit: "RATE_LIMITED",
  session_not_found: "NOT_AUTHENTICATED",
  user_not_found: "NOT_AUTHENTICATED",
};

/** Traduce un error de Supabase Auth o de Postgres a un código de la interfaz. */
export function authErrorCode(
  error: { code?: string | null; message?: string | null } | null | undefined,
): AuthErrorCode {
  if (!error) return "UNKNOWN";
  const byCode = error.code ? FROM_SUPABASE[error.code] : undefined;
  if (byCode) return byCode;
  const message = error.message?.trim() ?? "";
  if ((AUTH_ERROR_CODES as readonly string[]).includes(message)) return message as AuthErrorCode;
  // Supabase Auth responde a veces sin código (versiones viejas del servidor).
  if (/invalid login credentials/i.test(message)) return "INVALID_CREDENTIALS";
  if (/email not confirmed/i.test(message)) return "EMAIL_NOT_CONFIRMED";
  if (/provider is not enabled|unsupported provider/i.test(message)) return "GOOGLE_FAILED";
  return "UNKNOWN";
}

const MESSAGES: Record<AuthErrorCode, string> = {
  INVALID_CREDENTIALS: "El correo o la contraseña no coinciden",
  EMAIL_NOT_CONFIRMED: "Primero activa tu cuenta con el enlace que te enviamos al correo",
  INVALID_EMAIL: "Escribe un correo válido",
  WEAK_PASSWORD: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
  SAME_PASSWORD: "La contraseña nueva debe ser distinta de la anterior",
  LINK_EXPIRED: "El enlace venció o ya se usó. Pide uno nuevo",
  GOOGLE_FAILED: "No pudimos ingresar con Google. Intenta de nuevo o usa tu correo",
  RATE_LIMITED: "Hiciste muchos intentos seguidos. Espera unos minutos e intenta de nuevo",
  NOT_AUTHENTICATED: "Ingresa para continuar",
  FORBIDDEN: "No tienes permiso para hacer esto",
  USER_NOT_FOUND: "No hay una cuenta con ese correo. Pídele que se registre primero",
  CANNOT_REVOKE_SELF: "No puedes quitarte a ti mismo el rol de administrador",
  INVALID_INPUT: "Revisa los datos e intenta de nuevo",
  UNKNOWN: "No pudimos completar la acción. Intenta de nuevo",
};

/** Texto en español para mostrar al usuario. */
export function authErrorMessage(code: AuthErrorCode): string {
  return MESSAGES[code];
}
