import { bogotaInstant } from "@possos/booking";
import { toDateKey } from "@possos/ui";

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** `YYYY-MM-DD` válido o null. */
export function parseDay(value: string | undefined | null): string | null {
  if (!value || !DAY.test(value)) return null;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value) ? value : null;
}

/** Día (`YYYY-MM-DD`) y hora (`HH:MM`) de Bogotá a un instante ISO, o null. */
export function parseLocalInstant(day: string, time: string): string | null {
  if (!parseDay(day) || !TIME.test(time)) return null;
  return bogotaInstant(day, time);
}

/** Hoy en Bogotá. */
export function todayKey(): string {
  return toDateKey(new Date());
}

/** `HH:MM` de Bogotá de un instante (UTC-5 fijo, sin horario de verano). */
export function bogotaHourMinute(iso: string): string {
  return new Date(new Date(iso).getTime() - 5 * 3_600_000).toISOString().slice(11, 16);
}

/** El instante de hace `days` días (ISO). */
export function isoDaysAgo(days: number): string {
  return new Date(new Date().getTime() - days * 86_400_000).toISOString();
}
