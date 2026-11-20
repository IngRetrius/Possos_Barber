import { parseColombianMobile, PHONE_ERROR_KEY } from "./phone";

/**
 * Versión de la política de tratamiento de datos que acepta quien completa su perfil
 * (customers.data_policy_version). El texto está [PENDIENTE] del dueño: mientras tanto se
 * acepta este borrador. Cuando llegue el texto, se cambia esta versión y la página
 * /politica-de-datos; a cada cliente se le vuelve a pedir la autorización al entrar.
 */
export const DATA_POLICY_VERSION = "borrador-2026-11-19";

export const MAX_NAME_LENGTH = 80;

export type ProfileField = "fullName" | "phone" | "dataConsent";

export interface ProfileInput {
  fullName: string;
  /** Lo que escribió (10 dígitos, o con +57, espacios...). */
  phone: string;
  whatsappOptIn: boolean;
  /** Marcó la casilla de tratamiento de datos. Solo se pide si `needsConsent`. */
  dataConsent: boolean;
}

export interface ValidProfile {
  fullName: string;
  phoneE164: string;
  whatsappOptIn: boolean;
}

/** Clave del error; el formulario la traduce (`customers.profile.errors`). */
export type ProfileError =
  | "nameRequired"
  | "nameTooLong"
  | "phoneEmpty"
  | "phoneLength"
  | "phoneNotMobile"
  | "consentRequired";
export type ProfileErrors = Partial<Record<ProfileField, ProfileError>>;

/**
 * Revisa el formulario del perfil. La misma revisión en el navegador (antes de enviar) y en el
 * servidor. `requireConsent` es true al crear el perfil o cuando cambió la versión de la política.
 */
export function validateProfile(
  input: ProfileInput,
  options: { requireConsent: boolean },
): { ok: true; data: ValidProfile } | { ok: false; errors: ProfileErrors } {
  const errors: ProfileErrors = {};

  const fullName = input.fullName.trim().replace(/\s+/g, " ");
  if (!fullName) errors.fullName = "nameRequired";
  else if (fullName.length > MAX_NAME_LENGTH) errors.fullName = "nameTooLong";

  const phone = parseColombianMobile(input.phone);
  if (!phone.ok) errors.phone = PHONE_ERROR_KEY[phone.error];

  if (options.requireConsent && !input.dataConsent) {
    errors.dataConsent = "consentRequired";
  }

  if (Object.keys(errors).length || !phone.ok) return { ok: false, errors };
  return {
    ok: true,
    data: { fullName, phoneE164: phone.e164, whatsappOptIn: input.whatsappOptIn },
  };
}

/** El perfil no existe o la autorización es de otra versión de la política. */
export function needsConsent(profile: { data_policy_version: string | null } | null): boolean {
  return !profile || profile.data_policy_version !== DATA_POLICY_VERSION;
}
