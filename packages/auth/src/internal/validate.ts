import { MIN_PASSWORD_LENGTH, authErrorMessage } from "./errors";

/** Igual a `AuthFormState["fieldErrors"]` (sin importar index.ts, que reexporta este archivo). */
type FieldErrors = Partial<Record<"email" | "password", string>>;

/*
 * Revisión del correo y la contraseña antes de llamar a Supabase. La misma en el navegador
 * (antes de enviar) y en el servidor (por si el navegador no corrió JavaScript).
 */

export function validateEmail(value: string): string | undefined {
  const email = value.trim();
  if (!email) return "Escribe tu correo";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return authErrorMessage("INVALID_EMAIL");
  return undefined;
}

export function validatePassword(value: string, checkLength: boolean): string | undefined {
  if (!value) return "Escribe tu contraseña";
  if (checkLength && value.length < MIN_PASSWORD_LENGTH) return authErrorMessage("WEAK_PASSWORD");
  return undefined;
}

export function validateCredentials(
  input: { email: string; password?: string },
  options: { checkLength: boolean },
): FieldErrors | undefined {
  const errors: FieldErrors = {};
  const email = validateEmail(input.email);
  if (email) errors.email = email;
  if (input.password !== undefined) {
    const password = validatePassword(input.password, options.checkLength);
    if (password) errors.password = password;
  }
  return Object.keys(errors).length ? errors : undefined;
}
