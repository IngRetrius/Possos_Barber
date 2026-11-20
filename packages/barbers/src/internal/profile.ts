/*
 * Perfil del barbero en el panel del administrador. No importa ./index para que
 * dependency-cruiser no vea un ciclo.
 */

export const MAX_BARBER_NAME = 60;
export const MAX_BIO = 400;
/** Intervalos que ofrece el panel para las horas de inicio, en minutos. */
export const SLOT_INTERVALS = [15, 20, 30, 45, 60, 90, 120] as const;

export interface BarberProfileInput {
  displayName: string;
  bio: string;
  whatsappUrl: string;
  slotIntervalMin: string;
}

export interface ValidBarberProfile {
  display_name: string;
  bio: string | null;
  whatsapp_url: string | null;
  slot_interval_min: number;
}

export type BarberProfileField = "displayName" | "bio" | "whatsappUrl" | "slotIntervalMin";
/** Clave del error; el formulario la traduce (`barbers.form.errors`). */
export type BarberProfileError =
  "nameRequired" | "nameTooLong" | "bioTooLong" | "whatsappInvalid" | "intervalInvalid";
export type BarberProfileErrors = Partial<Record<BarberProfileField, BarberProfileError>>;

/**
 * Enlace de WhatsApp del barbero. Acepta `https://wa.me/57...` o el número de celular de 10
 * dígitos, que pasa a `https://wa.me/57<número>`.
 */
export function normalizeWhatsappUrl(value: string): string | null | undefined {
  const text = value.trim();
  if (!text) return null;
  const digits = text.replace(/[\s()-]/g, "");
  if (/^(\+?57)?3\d{9}$/.test(digits)) return `https://wa.me/57${digits.slice(-10)}`;
  try {
    const url = new URL(text);
    if (
      url.protocol === "https:" &&
      (url.hostname === "wa.me" || url.hostname.endsWith(".whatsapp.com"))
    ) {
      return url.toString();
    }
  } catch {
    // no es una URL
  }
  return undefined;
}

export function validateBarberProfile(
  input: BarberProfileInput,
): { ok: true; data: ValidBarberProfile } | { ok: false; errors: BarberProfileErrors } {
  const errors: BarberProfileErrors = {};
  const name = input.displayName.trim();
  if (!name) errors.displayName = "nameRequired";
  else if (name.length > MAX_BARBER_NAME) errors.displayName = "nameTooLong";
  const bio = input.bio.trim();
  if (bio.length > MAX_BIO) errors.bio = "bioTooLong";
  const whatsapp = normalizeWhatsappUrl(input.whatsappUrl);
  if (whatsapp === undefined) {
    errors.whatsappUrl = "whatsappInvalid";
  }
  const interval = Number(input.slotIntervalMin);
  if (!(SLOT_INTERVALS as readonly number[]).includes(interval)) {
    errors.slotIntervalMin = "intervalInvalid";
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      display_name: name,
      bio: bio || null,
      whatsapp_url: whatsapp ?? null,
      slot_interval_min: interval,
    },
  };
}
