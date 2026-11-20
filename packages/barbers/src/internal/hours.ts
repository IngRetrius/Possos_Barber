/*
 * Horario de la barbería para la página pública: los días con el mismo horario se juntan
 * ("Lunes a sábado"). No importa ./index para que dependency-cruiser no vea un ciclo.
 */
import { DEFAULT_LOCALE, type Locale } from "@possos/config/constants";
import { formatTime } from "@possos/ui";

export interface OpeningRange {
  /** ISO: 1 lunes, 7 domingo. */
  weekday: number;
  /** Hora local de Bogotá, `HH:MM` o `HH:MM:SS`. */
  start_time: string;
  end_time: string;
}

export interface OpeningHoursGroup {
  /** "Lunes a sábado", "Domingo", "Lunes, miércoles y viernes". */
  days: string;
  /** "9:00 a. m. a 12:00 p. m. y 2:00 p. m. a 7:00 p. m." o "Cerrado". */
  hours: string;
  closed: boolean;
}

/** Días de lunes a domingo en cada idioma (en español, en minúscula: van dentro de frases). */
export const WEEKDAY_NAMES_BY_LOCALE: Record<Locale, readonly string[]> = {
  es: ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"],
  en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
};

export const WEEKDAY_NAMES = WEEKDAY_NAMES_BY_LOCALE.es;

/** "a" entre dos horas o dos días, "y" antes del último de una lista y "Cerrado". */
const WORDS: Record<Locale, { to: string; and: string; closed: string }> = {
  es: { to: "a", and: "y", closed: "Cerrado" },
  en: { to: "to", and: "and", closed: "Closed" },
};

/** Hora del día en Bogotá ("14:00:00") en el formato de la app ("2:00 p. m."). */
export function formatTimeOfDay(time: string, locale: Locale = DEFAULT_LOCALE): string {
  const [h = "0", m = "0"] = time.split(":");
  // Un lunes cualquiera a esa hora en Bogotá (UTC-5 fijo, sin horario de verano).
  return formatTime(`2026-01-05T${h.padStart(2, "0")}:${m.padStart(2, "0")}:00-05:00`, locale);
}

function joinList(items: string[], locale: Locale): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${WORDS[locale].and} ${items.at(-1)}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Nombre de un conjunto de días: corridos con "a" (3 o más), sueltos con comas. */
function daysLabel(weekdays: number[], locale: Locale): string {
  const names = WEEKDAY_NAMES_BY_LOCALE[locale];
  const runs: number[][] = [];
  for (const day of weekdays) {
    const last = runs.at(-1);
    if (last && last.at(-1) === day - 1) last.push(day);
    else runs.push([day]);
  }
  const parts = runs.flatMap((run) =>
    run.length >= 3
      ? [`${names[run[0]! - 1]} ${WORDS[locale].to} ${names[run.at(-1)! - 1]}`]
      : run.map((d) => names[d - 1]!),
  );
  return capitalize(joinList(parts, locale));
}

/**
 * Agrupa el horario por días con los mismos rangos, de lunes a domingo. Los días sin rangos
 * quedan como "Cerrado". Sin rangos en toda la semana devuelve una lista vacía (horario
 * [PENDIENTE]).
 */
export function groupOpeningHours(
  ranges: OpeningRange[],
  locale: Locale = DEFAULT_LOCALE,
): OpeningHoursGroup[] {
  const to = WORDS[locale].to;
  if (ranges.length === 0) return [];
  const byDay = new Map<number, string>();
  for (let day = 1; day <= 7; day++) {
    const today = ranges
      .filter((r) => r.weekday === day)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
      .map(
        (r) =>
          `${formatTimeOfDay(r.start_time, locale)} ${to} ${formatTimeOfDay(r.end_time, locale)}`,
      );
    byDay.set(day, today.length ? joinList(today, locale) : "");
  }

  const groups: { hours: string; days: number[] }[] = [];
  for (let day = 1; day <= 7; day++) {
    const hours = byDay.get(day) ?? "";
    const group = groups.find((g) => g.hours === hours);
    if (group) group.days.push(day);
    else groups.push({ hours, days: [day] });
  }

  return groups.map((g) => ({
    days: daysLabel(g.days, locale),
    hours: g.hours || WORDS[locale].closed,
    closed: !g.hours,
  }));
}
