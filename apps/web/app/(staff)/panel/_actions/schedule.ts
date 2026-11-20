"use server";

import { revalidatePath } from "next/cache";
import {
  barbersErrorMessage,
  colombianHolidays,
  parseWeeklyRanges,
  validateWeeklyRanges,
} from "@possos/barbers";
import { deleteTimeOff, setWorkingHours } from "@possos/barbers/server";
import type { TimeOffFormState, WeeklyHoursState } from "@possos/barbers/ui";
import {
  addDays,
  bogotaInstant,
  bookingErrorMessage,
  type BookingErrorCode,
} from "@possos/booking";
import { blockTime } from "@possos/booking/server";
import type { Locale } from "@possos/config/constants";
import { formatters, toDateKey } from "@possos/ui";
import { canActOnBarber, loadPanel } from "../../../../lib/panel";
import { parseDay } from "../../../../lib/panel-dates";
import { getTranslations } from "next-intl/server";
import { currentLocale } from "../../../../lib/i18n";

/** Textos de las acciones del panel, en el idioma de la petición. */
const actionText = () => getTranslations("web.panel.actions");

/*
 * Horario y bloqueos. El barbero, los suyos; el administrador, los de cualquiera (docs/06).
 * Cada acción repite la guarda y la base vuelve a revisar (set_working_hours, create_time_off).
 */

const text = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
};

const BARBERS_CODES = new Set(["HOURS_OVERLAP", "TIME_OFF_OVERLAP"]);
const scheduleError = (code: string, locale: Locale) =>
  BARBERS_CODES.has(code)
    ? barbersErrorMessage(code as "HOURS_OVERLAP" | "TIME_OFF_OVERLAP", locale)
    : bookingErrorMessage(code as BookingErrorCode, locale);

export async function saveHoursAction(
  _prev: WeeklyHoursState,
  form: FormData,
): Promise<WeeklyHoursState> {
  const ctx = await loadPanel("/panel/horario");
  const barberId = text(form, "barbero");
  if (!canActOnBarber(ctx, barberId))
    return { error: barbersErrorMessage("FORBIDDEN", await currentLocale()) };
  const ranges = parseWeeklyRanges(form.getAll("rango").map(String));
  if (validateWeeklyRanges(ranges).size)
    return { error: barbersErrorMessage("INVALID_INPUT", await currentLocale()) };
  const result = await setWorkingHours(ctx.db, barberId, ranges);
  if (!result.ok) return { error: barbersErrorMessage(result.error, await currentLocale()) };
  revalidatePath("/panel", "layout");
  return { saved: true };
}

export async function createTimeOffAction(
  _prev: TimeOffFormState,
  form: FormData,
): Promise<TimeOffFormState> {
  const ctx = await loadPanel("/panel/bloqueos");
  const barberId = text(form, "barbero");
  if (!canActOnBarber(ctx, barberId))
    return { error: barbersErrorMessage("FORBIDDEN", await currentLocale()) };

  const from = parseDay(text(form, "desde"));
  const to = parseDay(text(form, "hasta")) ?? from;
  if (!from) return { fieldErrors: { from: (await actionText())("dateRequired") } };
  if (!to || to < from) return { fieldErrors: { to: (await actionText())("toInvalid") } };
  const allDay = form.get("todo_el_dia") === "si";
  const startTime = allDay ? "00:00" : text(form, "inicio");
  const endTime = allDay ? "00:00" : text(form, "fin");
  if (!allDay && (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime))) {
    return { fieldErrors: { time: (await actionText())("timesRequired") } };
  }
  const startsAt = bogotaInstant(from, startTime);
  const endsAt = bogotaInstant(allDay ? addDays(to, 1) : to, endTime);
  if (endsAt <= startsAt) return { fieldErrors: { time: (await actionText())("endAfterStart") } };

  const result = await blockTime(ctx.db, {
    barberId,
    startsAt,
    endsAt,
    reason: text(form, "motivo").trim() || undefined,
  });
  if (!result.ok) return { error: scheduleError(result.error, await currentLocale()) };
  revalidatePath("/panel", "layout");
  const f = formatters(await currentLocale());
  return {
    created: true,
    conflicts: result.data.conflicts.map((c) => ({
      id: c.id,
      label: `${f.date(c.start_at)}, ${f.time(c.start_at)} · ${c.customer_name}`,
      href: `/panel?dia=${toDateKey(c.start_at)}&cita=${c.id}`,
    })),
  };
}

export async function deleteTimeOffAction(form: FormData): Promise<void> {
  const ctx = await loadPanel("/panel/bloqueos");
  await deleteTimeOff(ctx.db, text(form, "bloqueo"));
  revalidatePath("/panel", "layout");
}

/** Acepta un festivo sugerido: lo bloquea todo el día con su nombre como motivo. */
export async function blockHolidayAction(form: FormData): Promise<void> {
  const ctx = await loadPanel("/panel/bloqueos");
  const barberId = text(form, "barbero");
  const day = parseDay(text(form, "fecha"));
  if (!day || !canActOnBarber(ctx, barberId)) return;
  const holiday = colombianHolidays(Number(day.slice(0, 4))).find((h) => h.date === day);
  if (!holiday) return;
  await blockTime(ctx.db, {
    barberId,
    startsAt: bogotaInstant(day, "00:00"),
    endsAt: bogotaInstant(addDays(day, 1), "00:00"),
    reason: `Festivo: ${holiday.name}`,
  });
  revalidatePath("/panel", "layout");
}
