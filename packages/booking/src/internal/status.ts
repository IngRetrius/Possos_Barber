/*
 * Cómo se muestra cada estado de una cita (docs/11 y la página de muestras de F1), en cada idioma.
 * El tono es el de `StatusBadge` de @possos/ui. No importa ./index para que dependency-cruiser no
 * vea un ciclo.
 */
import { LOCALES, type Locale } from "@possos/config/constants";
import type { StatusTone } from "@possos/ui";
import type { Enums } from "@possos/supabase";
import { messages } from "../messages";

type AppointmentStatus = Enums<"appointment_status">;
type StatusDisplay = { label: string; tone: StatusTone };

const TONE: Record<AppointmentStatus, StatusTone> = {
  confirmed: "success",
  booked: "neutral",
  pending_approval: "warning",
  no_show: "danger",
  completed: "neutral",
  cancelled: "neutral",
  rejected: "neutral",
};

function byLocale<T>(build: (locale: Locale) => T): Record<Locale, T> {
  return Object.fromEntries(LOCALES.map((locale) => [locale, build(locale)])) as Record<Locale, T>;
}

/** `APPOINTMENT_STATUS_DISPLAY[locale][status]`: nombre del estado y tono. */
export const APPOINTMENT_STATUS_DISPLAY: Record<
  Locale,
  Record<AppointmentStatus, StatusDisplay>
> = byLocale(
  (locale) =>
    Object.fromEntries(
      (Object.keys(TONE) as AppointmentStatus[]).map((status) => [
        status,
        { label: messages[locale].status[status], tone: TONE[status] },
      ]),
    ) as Record<AppointmentStatus, StatusDisplay>,
);
