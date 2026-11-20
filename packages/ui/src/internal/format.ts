import { DEFAULT_LOCALE, LOCALE, TIMEZONE, type Locale } from "@possos/config/constants";

/**
 * Formato de fechas, horas, precios y duraciones en hora de Bogotá, en español de Colombia o en
 * inglés (docs/11-interfaz.md). Todo instante se muestra en `America/Bogota`, sin importar la zona
 * del equipo donde corra. Cada función recibe el idioma al final y por omisión usa el español; en
 * los componentes, `useFormat()` las entrega ya con el idioma de la persona.
 *
 * Los nombres de días y meses están escritos aquí en vez de pedírselos a `Intl` porque cada motor
 * (Safari, Chrome, Node) los abrevia distinto ("jue." o "jue", "sep" o "sept."). Así el texto es
 * el mismo en el servidor y en el celular.
 */

/** Un instante (`Date`, ISO o milisegundos) o un día del calendario como `YYYY-MM-DD`. */
export type DateInput = Date | string | number;

/** Espacio que no se parte: "3:00 p. m." nunca queda con "p." en una línea y "m." en otra. */
const NBSP = "\u00a0";

interface Names {
  weekdays: string[];
  weekdaysShort: string[];
  months: string[];
  monthsShort: string[];
}

const NAMES: Record<Locale, Names> = {
  es: {
    weekdays: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"],
    weekdaysShort: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"],
    months: [
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
    ],
    monthsShort: [
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
    ],
  },
  en: {
    weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    weekdaysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    months: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
    monthsShort: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ],
  },
};

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

/** "jue 20 nov" / "Thu, Nov 20" */
export function formatDate(input: DateInput, locale: Locale = DEFAULT_LOCALE): string {
  const p = bogotaParts(input);
  const n = NAMES[locale];
  return locale === "en"
    ? `${n.weekdaysShort[p.weekday]}, ${n.monthsShort[p.month - 1]} ${p.day}`
    : `${n.weekdaysShort[p.weekday]} ${p.day} ${n.monthsShort[p.month - 1]}`;
}

/** "jueves 20 de noviembre" / "Thursday, November 20" */
export function formatDateLong(input: DateInput, locale: Locale = DEFAULT_LOCALE): string {
  const p = bogotaParts(input);
  const n = NAMES[locale];
  return locale === "en"
    ? `${n.weekdays[p.weekday]}, ${n.months[p.month - 1]} ${p.day}`
    : `${n.weekdays[p.weekday]} ${p.day} de ${n.months[p.month - 1]}`;
}

/** "jue" / "Thu" */
export function formatWeekdayShort(input: DateInput, locale: Locale = DEFAULT_LOCALE): string {
  return NAMES[locale].weekdaysShort[bogotaParts(input).weekday] ?? "";
}

/** "noviembre 2026" / "November 2026" */
export function formatMonthYear(input: DateInput, locale: Locale = DEFAULT_LOCALE): string {
  const p = bogotaParts(input);
  return `${NAMES[locale].months[p.month - 1]} ${p.year}`;
}

/** "3:00" (sin a. m. ni p. m.; para la cuadrícula, donde el grupo ya lo dice). */
export function formatTimeShort(input: DateInput): string {
  const { hour, minute } = bogotaParts(input);
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, "0")}`;
}

/** "3:00 p. m." / "3:00 PM". "12:00 a. m." es medianoche y "12:00 p. m.", mediodía. */
export function formatTime(input: DateInput, locale: Locale = DEFAULT_LOCALE): string {
  const { hour } = bogotaParts(input);
  const morning = hour < 12;
  const suffix =
    locale === "en" ? (morning ? "AM" : "PM") : morning ? `a.${NBSP}m.` : `p.${NBSP}m.`;
  return `${formatTimeShort(input)}${NBSP}${suffix}`;
}

/** "3:00 p. m. a 4:00 p. m." / "3:00 PM to 4:00 PM" */
export function formatTimeRange(
  start: DateInput,
  end: DateInput,
  locale: Locale = DEFAULT_LOCALE,
): string {
  return `${formatTime(start, locale)} ${locale === "en" ? "to" : "a"} ${formatTime(end, locale)}`;
}

/**
 * "$35.000" / "$35,000". Pesos colombianos, sin decimales; el separador de miles es el de cada
 * idioma.
 */
export function formatPrice(pesos: number, locale: Locale = DEFAULT_LOCALE): string {
  if (!Number.isFinite(pesos)) {
    throw new RangeError(`Precio no válido: ${pesos}`);
  }
  const rounded = Math.round(Math.abs(pesos));
  const separator = locale === "en" ? "," : ".";
  const digits = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  return `${pesos < 0 && rounded !== 0 ? "-" : ""}$${digits}`;
}

/** Hasta 60 minutos, "45 min" o "60 min"; desde ahí, en horas: "2 h", "1 h 30 min". */
export function formatDuration(minutes: number): string {
  if (minutes <= 60) return `${minutes}${NBSP}min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}${NBSP}h ${rest}${NBSP}min` : `${hours}${NBSP}h`;
}

/** Franja del día en Bogotá: mañana antes de las 12, tarde de 12 a 6 p. m. y noche desde las 6. */
export type DayPeriod = "morning" | "afternoon" | "evening";

export const DAY_PERIOD_LABEL: Record<Locale, Record<DayPeriod, string>> = {
  es: { morning: "Mañana", afternoon: "Tarde", evening: "Noche" },
  en: { morning: "Morning", afternoon: "Afternoon", evening: "Evening" },
};

export function dayPeriod(input: DateInput): DayPeriod {
  const { hour } = bogotaParts(input);
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

/** Las funciones de formato con el idioma ya puesto (para `useFormat` y el servidor). */
export function formatters(locale: Locale) {
  return {
    locale,
    date: (input: DateInput) => formatDate(input, locale),
    dateLong: (input: DateInput) => formatDateLong(input, locale),
    weekdayShort: (input: DateInput) => formatWeekdayShort(input, locale),
    monthYear: (input: DateInput) => formatMonthYear(input, locale),
    timeShort: formatTimeShort,
    time: (input: DateInput) => formatTime(input, locale),
    timeRange: (start: DateInput, end: DateInput) => formatTimeRange(start, end, locale),
    price: (pesos: number) => formatPrice(pesos, locale),
    duration: formatDuration,
    dayPeriodLabel: (period: DayPeriod) => DAY_PERIOD_LABEL[locale][period],
  };
}

export type Formatters = ReturnType<typeof formatters>;
