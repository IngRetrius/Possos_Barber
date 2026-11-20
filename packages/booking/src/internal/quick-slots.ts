import { toDateKey } from "@possos/ui";
import type { DayAvailability } from "./selection";

/*
 * "Próximas horas" del inicio (docs/11): las primeras horas libres de un servicio, para reservar
 * sin pasar por el paso de horario. Lógica pura; la app trae las horas y pinta `QuickSlots`.
 */

/** Cuántas horas se muestran en cada servicio: dos filas de tres. */
export const QUICK_SLOTS_LIMIT = 6;

/** Cuántos días con horas se consultan: con uno a veces no alcanzan las seis. */
export const QUICK_SLOTS_DAYS = 2;

/** Los primeros días con horas libres, en orden, para pedir sus horas. */
export function pickQuickDays(days: DayAvailability[], count = QUICK_SLOTS_DAYS): string[] {
  return days
    .filter((d) => d.slots > 0)
    .map((d) => d.date)
    .sort()
    .slice(0, count);
}

export interface QuickSlotDay {
  /** `YYYY-MM-DD` en Bogotá. */
  date: string;
  /** "Hoy", "Mañana" o null (la vista pone la fecha corta). */
  relative: "today" | "tomorrow" | null;
  slots: string[];
}

/** `YYYY-MM-DD` del día siguiente. Bogotá no cambia de hora, así que basta sumar 24 h al mediodía. */
export function nextDateKey(date: string): string {
  return toDateKey(new Date(Date.parse(`${date}T12:00:00-05:00`) + 24 * 60 * 60 * 1000));
}

/**
 * Las primeras `limit` horas, en orden y agrupadas por día. `today` es la fecha de Bogotá
 * (`toDateKey(new Date())`) para decir "Hoy" y "Mañana".
 */
export function groupQuickSlots(
  slots: string[],
  today: string,
  limit = QUICK_SLOTS_LIMIT,
): QuickSlotDay[] {
  const tomorrow = nextDateKey(today);
  const sorted = [...new Set(slots)].sort((a, b) => Date.parse(a) - Date.parse(b)).slice(0, limit);
  const groups: QuickSlotDay[] = [];
  for (const slot of sorted) {
    const date = toDateKey(slot);
    let group = groups.at(-1);
    if (!group || group.date !== date) {
      group = {
        date,
        relative: date === today ? "today" : date === tomorrow ? "tomorrow" : null,
        slots: [],
      };
      groups.push(group);
    }
    group.slots.push(slot);
  }
  return groups;
}
