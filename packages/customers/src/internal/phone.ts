import { DEFAULT_LOCALE, type Locale } from "@possos/config/constants";
import { messages } from "../messages";

/**
 * Celular colombiano en E.164: +57 y 10 dígitos que empiezan por 3 (los fijos empiezan por 60,
 * y a esos no les llega WhatsApp). La base solo exige +57 y 10 dígitos (customers.phone);
 * aquí se revisa además que sea celular, para dar un mensaje claro antes de enviar.
 */

export type PhoneError = "EMPTY" | "LENGTH" | "NOT_MOBILE";

export type ParsedPhone =
  { ok: true; e164: string; national: string } | { ok: false; error: PhoneError };

/**
 * Deja solo los dígitos del número nacional, para el campo con el +57 fijo (`PhoneInput`).
 * Si pegan "+57 300 123 4567" o "57 3001234567", quita el 57.
 */
export function normalizePhoneDigits(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("57")) digits = digits.slice(2);
  return digits.slice(0, 10);
}

/** Revisa el celular escrito (con o sin +57, espacios, guiones o paréntesis). */
export function parseColombianMobile(value: string): ParsedPhone {
  const raw = value.replace(/\D/g, "");
  if (!raw) return { ok: false, error: "EMPTY" };
  const national = raw.length === 12 && raw.startsWith("57") ? raw.slice(2) : raw;
  if (national.length !== 10) return { ok: false, error: "LENGTH" };
  if (!national.startsWith("3")) return { ok: false, error: "NOT_MOBILE" };
  return { ok: true, e164: `+57${national}`, national };
}

/** Texto del error del celular, en el idioma de la persona. */
export function phoneErrorMessage(error: PhoneError, locale: Locale = DEFAULT_LOCALE): string {
  return messages[locale].phone[error];
}

/** Clave del error del celular en los formularios (`phoneEmpty`, `phoneLength`...). */
export const PHONE_ERROR_KEY = {
  EMPTY: "phoneEmpty",
  LENGTH: "phoneLength",
  NOT_MOBILE: "phoneNotMobile",
} as const satisfies Record<PhoneError, string>;

/** "+573001234567" → "300 123 4567". Lo que no sea un celular colombiano queda igual. */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  const match = /^\+57(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return match ? `${match[1]} ${match[2]} ${match[3]}` : e164;
}
