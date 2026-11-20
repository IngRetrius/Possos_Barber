/*
 * Reglas de la agenda que fija el administrador (booking_settings, docs/04). No importa ./index
 * para que dependency-cruiser no vea un ciclo.
 */

export interface BookingSettingsInput {
  minLeadMin: string;
  maxDaysAhead: string;
  cancelWindowMin: string;
  noShowThreshold: string;
}

export interface ValidBookingSettings {
  min_lead_min: number;
  max_days_ahead: number;
  cancel_window_min: number;
  no_show_threshold: number;
}

export type BookingSettingsField = keyof BookingSettingsInput;
/** Clave del error; el formulario la traduce (`booking.settings`). */
export type BookingSettingsError = "minutesRange" | "daysRange" | "thresholdRange";
export type BookingSettingsErrors = Partial<Record<BookingSettingsField, BookingSettingsError>>;

function whole(value: string, min: number, max: number): number | null {
  const text = value.trim();
  if (!/^\d+$/.test(text)) return null;
  const n = Number(text);
  return n >= min && n <= max ? n : null;
}

/** Los minutos y los días como números enteros dentro de un rango razonable. */
export function validateBookingSettings(
  input: BookingSettingsInput,
): { ok: true; data: ValidBookingSettings } | { ok: false; errors: BookingSettingsErrors } {
  const errors: BookingSettingsErrors = {};
  const lead = whole(input.minLeadMin, 0, 10_080);
  if (lead === null) errors.minLeadMin = "minutesRange";
  const days = whole(input.maxDaysAhead, 1, 365);
  if (days === null) errors.maxDaysAhead = "daysRange";
  const cancel = whole(input.cancelWindowMin, 0, 10_080);
  if (cancel === null) errors.cancelWindowMin = "minutesRange";
  const threshold = whole(input.noShowThreshold, 1, 20);
  if (threshold === null) errors.noShowThreshold = "thresholdRange";
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      min_lead_min: lead!,
      max_days_ahead: days!,
      cancel_window_min: cancel!,
      no_show_threshold: threshold!,
    },
  };
}
