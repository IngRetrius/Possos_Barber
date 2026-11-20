/*
 * Clientes desde el panel (F6): el personal busca a un cliente o registra uno sin cuenta con la
 * autorización de datos que dio de palabra (Ley 1581). No importa ./index para que
 * dependency-cruiser no vea un ciclo.
 */
import { parseColombianMobile, PHONE_ERROR_KEY } from "./phone";
import { MAX_NAME_LENGTH, type ProfileError } from "./profile";

export interface StaffCustomerInput {
  fullName: string;
  phone: string;
  /** El cliente autorizó de palabra el tratamiento de sus datos. */
  dataConsent: boolean;
  whatsappOptIn: boolean;
}

export interface ValidStaffCustomer {
  fullName: string;
  phoneE164: string;
  whatsappOptIn: boolean;
}

export type StaffCustomerField = "fullName" | "phone" | "dataConsent";
/** Clave del error; el selector la traduce (`customers.picker.errors`). */
export type StaffCustomerErrors = Partial<Record<StaffCustomerField, ProfileError>>;

export function validateStaffCustomer(
  input: StaffCustomerInput,
): { ok: true; data: ValidStaffCustomer } | { ok: false; errors: StaffCustomerErrors } {
  const errors: StaffCustomerErrors = {};
  const fullName = input.fullName.trim().replace(/\s+/g, " ");
  if (!fullName) errors.fullName = "nameRequired";
  else if (fullName.length > MAX_NAME_LENGTH) errors.fullName = "nameTooLong";
  const phone = parseColombianMobile(input.phone);
  if (!phone.ok) errors.phone = PHONE_ERROR_KEY[phone.error];
  if (!input.dataConsent) {
    errors.dataConsent = "consentRequired";
  }
  if (Object.keys(errors).length || !phone.ok) return { ok: false, errors };
  return {
    ok: true,
    data: { fullName, phoneE164: phone.e164, whatsappOptIn: input.whatsappOptIn },
  };
}

/**
 * Texto de búsqueda seguro para un filtro de PostgREST (`or=(...ilike...)`): sin comas,
 * paréntesis, comodines ni barras, que cambiarían el filtro. Los dígitos de un celular escrito
 * con espacios se juntan.
 */
export function searchTerm(value: string): string {
  const text = value
    .replace(/[,()*%_\\:."']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (/^[\d\s+]+$/.test(text)) return text.replace(/\D/g, "").replace(/^57(?=\d{10}$)/, "");
  return text.slice(0, 60);
}

/** Enlace para abrir el chat de WhatsApp con un celular en E.164, o null. */
export function whatsappChatUrl(e164: string | null | undefined): string | null {
  if (!e164 || !/^\+\d{8,15}$/.test(e164)) return null;
  return `https://wa.me/${e164.slice(1)}`;
}
