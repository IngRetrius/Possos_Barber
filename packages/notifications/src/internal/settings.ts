/*
 * Configuración de los recordatorios que fija el administrador (notification_settings, docs/03).
 * El despacho es de F7: hasta entonces, cambiar esto no envía nada.
 */

export interface ReminderSettingsInput {
  /** Horas antes de la cita del primer recordatorio ("24"). */
  firstHours: string;
  /** Horas antes del segundo, o vacío para no mandarlo ("2"). */
  secondHours: string;
  sendConfirmation: boolean;
}

export interface ValidReminderSettings {
  reminder_offsets_min: number[];
  send_confirmation: boolean;
}

export type ReminderSettingsErrors = Partial<Record<"firstHours" | "secondHours", string>>;

function hours(value: string): number | null | undefined {
  const text = value.trim().replace(",", ".");
  if (!text) return null;
  if (!/^\d{1,3}(\.5)?$/.test(text)) return undefined;
  const n = Number(text);
  return n > 0 && n <= 168 ? n : undefined;
}

/** Horas (enteras o con media hora) a minutos, del más lejano al más cercano. */
export function validateReminderSettings(
  input: ReminderSettingsInput,
): { ok: true; data: ValidReminderSettings } | { ok: false; errors: ReminderSettingsErrors } {
  const errors: ReminderSettingsErrors = {};
  const first = hours(input.firstHours);
  const second = hours(input.secondHours);
  if (first === null || first === undefined) errors.firstHours = "Escribe las horas (1 a 168)";
  if (second === undefined) errors.secondHours = "Escribe las horas (1 a 168) o déjalo vacío";
  if (first && second && second >= first) {
    errors.secondHours = "Debe ser más cerca de la cita que el primero";
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  const offsets = [first!, ...(second ? [second] : [])].map((h) => Math.round(h * 60));
  return {
    ok: true,
    data: { reminder_offsets_min: offsets, send_confirmation: input.sendConfirmation },
  };
}

/** Minutos a horas para el formulario: 1440 → "24", 90 → "1,5". */
export function offsetToHours(minutes: number | undefined): string {
  if (minutes === undefined) return "";
  return String(minutes / 60).replace(".", ",");
}
