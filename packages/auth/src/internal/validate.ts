import { DEFAULT_LOCALE, type Locale } from "@possos/config/constants";
import { messages } from "../messages";
import { authErrorMessage } from "./errors";
import { MIN_PASSWORD_LENGTH } from "./password";

/** Igual a `AuthFormState["fieldErrors"]` (sin importar index.ts, que reexporta este archivo). */
type FieldErrors = Partial<Record<"email" | "password", string>>;

/*
 * Revisión del correo y la contraseña antes de llamar a Supabase. La misma en el navegador
 * (antes de enviar) y en el servidor (por si el navegador no corrió JavaScript). Devuelve el
 * texto del error en el idioma de la persona, como los errores de Supabase que la acción pone en
 * el mismo campo.
 */

export function validateEmail(value: string, locale: Locale = DEFAULT_LOCALE): string | undefined {
  const email = value.trim();
  if (!email) return messages[locale].validation.emailRequired;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return authErrorMessage("INVALID_EMAIL", locale);
  return undefined;
}

export function validatePassword(
  value: string,
  checkLength: boolean,
  locale: Locale = DEFAULT_LOCALE,
): string | undefined {
  if (!value) return messages[locale].validation.passwordRequired;
  if (checkLength && value.length < MIN_PASSWORD_LENGTH) {
    return authErrorMessage("WEAK_PASSWORD", locale);
  }
  return undefined;
}

export function validateCredentials(
  input: { email: string; password?: string },
  options: { checkLength: boolean; locale?: Locale },
): FieldErrors | undefined {
  const locale = options.locale ?? DEFAULT_LOCALE;
  const errors: FieldErrors = {};
  const email = validateEmail(input.email, locale);
  if (email) errors.email = email;
  if (input.password !== undefined) {
    const password = validatePassword(input.password, options.checkLength, locale);
    if (password) errors.password = password;
  }
  return Object.keys(errors).length ? errors : undefined;
}
