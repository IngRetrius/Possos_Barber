import "server-only";
import type { Barber } from "@possos/barbers";
import { getWorkingHours, listTimeOff } from "@possos/barbers/server";
import {
  addDays,
  buildDayAgenda,
  dayBounds,
  isoWeekday,
  parsePeriod,
  type AgendaItem,
} from "@possos/booking";
import { listAgenda } from "@possos/booking/server";
import type { AgendaAppointment } from "@possos/booking";
import type { DbClient } from "@possos/supabase";

/**
 * Agenda de un día de un barbero, armada con lo que leen barbers y booking. La usan "Hoy",
 * "Semana", "Nueva cita" y "Mover".
 */
export async function loadDayAgenda(db: DbClient, barber: Barber, day: string) {
  const { items, appointments, ok } = (await loadAgendaDays(db, barber, day, 1))[0]!;
  return { items, appointments, ok };
}

/** La agenda de `count` días seguidos desde `first`, con tres consultas en total. */
export async function loadAgendaDays(
  db: DbClient,
  barber: Barber,
  first: string,
  count: number,
): Promise<{ day: string; items: AgendaItem[]; appointments: AgendaAppointment[]; ok: boolean }[]> {
  const from = dayBounds(first).from;
  const to = dayBounds(addDays(first, count - 1)).to;
  const [agenda, hours, blocks] = await Promise.all([
    listAgenda(db, { barberId: barber.id, from, to }),
    getWorkingHours(db, barber.id),
    listTimeOff(db, { barberId: barber.id, from, to }),
  ]);
  const ok = agenda.ok && hours.ok && blocks.ok;
  const allAppointments = agenda.ok ? agenda.data : [];
  const allBlocks = (blocks.ok ? blocks.data : []).flatMap((b) => {
    const period = parsePeriod(b.period);
    return period ? [{ id: b.id, start: period.start, end: period.end, reason: b.reason }] : [];
  });
  return Array.from({ length: count }, (_, i) => {
    const day = addDays(first, i);
    const bounds = dayBounds(day);
    const inDay = (x: { start: string; end: string }) =>
      new Date(x.start) < new Date(bounds.to) && new Date(x.end) > new Date(bounds.from);
    // Una cita es del día en que empieza.
    const appointments = allAppointments.filter(
      (a) => a.start >= bounds.from && a.start < bounds.to,
    );
    const items = buildDayAgenda({
      day,
      ranges: hours.ok ? hours.data.filter((h) => h.weekday === isoWeekday(day)) : [],
      intervalMin: barber.slot_interval_min,
      appointments,
      blocks: allBlocks.filter(inDay),
    });
    return { day, items, appointments, ok };
  });
}

/** Horas libres de un día, como atajos de "Nueva cita" y "Mover". */
export async function freeStartsFor(db: DbClient, barber: Barber, day: string): Promise<string[]> {
  const { items } = await loadDayAgenda(db, barber, day);
  return items.filter((i) => i.kind === "free").map((i) => i.start);
}
