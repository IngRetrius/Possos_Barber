import { LOCALE, TIMEZONE } from "@possos/config/constants";

/**
 * Formato de fechas, horas, precios y duraciones en español de Colombia y hora de Bogotá
 * (docs/11-interfaz.md). Todo instante se muestra en `America/Bogota`, sin importar la zona del
 * equipo donde corra.
 *
 * Los nombres de días y meses están escritos aquí en vez de pedírselos a `Intl` porque cada motor
 * (Safari, Chrome, Node) los abrevia distinto ("jue." o "jue", "sep" o "sept."). Así el texto es
 * el mismo en el servidor y en el celular.
 */

/** Un instante (`Date`, ISO o milisegundos) o un día del calendario como `YYYY-MM-DD`. */
export type DateInput = Date | string | number;

/** Espacio que no se parte: "3:00 p. m." nunca queda con "p." en una línea y "m." en otra. */
const NBSP = " ";

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const WEEKDAYS_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const MONTHS_SHORT = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sept",
  "oct",
  "nov",
  "dic",
];

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

const partsFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hourCycle: "h23",
});

export interface BogotaParts {
  year: number;
  /** 1 a 12. */
  month: number;
  day: number;
  /** 0 a 23. */
  hour: number;
  minute: number;
  /** 0 es domingo. */
  weekday: number;
}

/** Fecha y hora de un instante en Bogotá. Un `YYYY-MM-DD` se toma como ese día, a medianoche. */
export function bogotaParts(input: DateInput): BogotaParts {
  if (typeof input === "string") {
    const key = DATE_KEY.exec(input);
    if (key) {
      const [year, month, day] = [Number(key[1]), Number(key[2]), Number(key[3])];
      const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
      return { year, month, day, hour: 0, minute: 0, weekday };
    }
  }
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`Fecha no válida: ${String(input)}`);
  }
  const parts = partsFormatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  const [year, month, day] = [get("year"), get("month"), get("day")];
  return {
    year,
    month,
    day,
    hour: get("hour"),
    minute: get("minute"),
    weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
  };
}

/** Día del calendario en Bogotá como `YYYY-MM-DD`. Sirve de clave para la tira de días. */
export function toDateKey(input: DateInput): string {
  const { year, month, day } = bogotaParts(input);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** "jue 20 nov" */
export function formatDate(input: DateInput): string {
  const p = bogotaParts(input);
  return `${WEEKDAYS_SHORT[p.weekday]} ${p.day} ${MONTHS_SHORT[p.month - 1]}`;
}

/** "jueves 20 de noviembre" */
export function formatDateLong(input: DateInput): string {
  const p = bogotaParts(input);
  return `${WEEKDAYS[p.weekday]} ${p.day} de ${MONTHS[p.month - 1]}`;
}

/** "jue" */
export function formatWeekdayShort(input: DateInput): string {
  return WEEKDAYS_SHORT[bogotaParts(input).weekday] ?? "";
}

/** "noviembre 2026" */
export function formatMonthYear(input: DateInput): string {
  const p = bogotaParts(input);
  return `${MONTHS[p.month - 1]} ${p.year}`;
}

/** "3:00" (sin a. m. ni p. m.; para la cuadrícula, donde el grupo ya lo dice). */
export function formatTimeShort(input: DateInput): string {
  const { hour, minute } = bogotaParts(input);
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, "0")}`;
}

/** "3:00 p. m.", "12:00 a. m." (medianoche), "12:00 p. m." (mediodía). */
export function formatTime(input: DateInput): string {
  const { hour } = bogotaParts(input);
  const suffix = hour < 12 ? `a.${NBSP}m.` : `p.${NBSP}m.`;
  return `${formatTimeShort(input)}${NBSP}${suffix}`;
}

/** "3:00 p. m. a 4:00 p. m." */
export function formatTimeRange(start: DateInput, end: DateInput): string {
  return `${formatTime(start)} a ${formatTime(end)}`;
}

/** "$35.000". Pesos colombianos, sin decimales y con punto de miles. */
export function formatPrice(pesos: number): string {
  if (!Number.isFinite(pesos)) {
    throw new RangeError(`Precio no válido: ${pesos}`);
  }
  const rounded = Math.round(Math.abs(pesos));
  const digits = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${pesos < 0 && rounded !== 0 ? "-" : ""}$${digits}`;
}

/** "60 min" */
export function formatDuration(minutes: number): string {
  return `${minutes}${NBSP}min`;
}

/** Franja del día en Bogotá: mañana antes de las 12, tarde de 12 a 6 p. m. y noche desde las 6. */
export type DayPeriod = "morning" | "afternoon" | "evening";

export const DAY_PERIOD_LABEL: Record<DayPeriod, string> = {
  morning: "Mañana",
  afternoon: "Tarde",
  evening: "Noche",
};

export function dayPeriod(input: DateInput): DayPeriod {
  const { hour } = bogotaParts(input);
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}
