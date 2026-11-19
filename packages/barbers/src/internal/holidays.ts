/*
 * Festivos de Colombia, calculados (no escritos a mano) para sugerirlos como bloqueos.
 *
 * - Ley 51 de 1983 ("Ley Emiliani"): estos festivos se trasladan al lunes siguiente si no caen
 *   en lunes. Año Nuevo, 1 de mayo, 20 de julio, 7 de agosto, 8 y 25 de diciembre, y Jueves y
 *   Viernes Santo no se trasladan.
 * - Los de Semana Santa, Ascensión, Corpus Christi y Sagrado Corazón dependen de la Pascua
 *   (algoritmo de Meeus/Jones/Butcher para el calendario gregoriano). Ascensión, Corpus y Sagrado
 *   Corazón ya se cuentan desde el lunes al que se trasladan (Pascua + 43, + 64 y + 71 días).
 * - Ley 2578 de 2026: el 9 de julio (Virgen de Chiquinquirá) es festivo desde 2026, también
 *   trasladable. Sancionada el 1 de junio de 2026; el Ministerio del Interior la anunció el 5.
 *
 * No importa ./index para que dependency-cruiser no vea un ciclo.
 */

export interface Holiday {
  /** Día del calendario `YYYY-MM-DD` en que se descansa (ya trasladado). */
  date: string;
  name: string;
}

interface FixedRule {
  month: number;
  day: number;
  name: string;
  movable: boolean;
  /** Primer año en que aplica. */
  since?: number;
}

const FIXED: FixedRule[] = [
  { month: 1, day: 1, name: "Año Nuevo", movable: false },
  { month: 1, day: 6, name: "Reyes Magos", movable: true },
  { month: 3, day: 19, name: "San José", movable: true },
  { month: 5, day: 1, name: "Día del Trabajo", movable: false },
  { month: 6, day: 29, name: "San Pedro y San Pablo", movable: true },
  { month: 7, day: 9, name: "Virgen de Chiquinquirá", movable: true, since: 2026 },
  { month: 7, day: 20, name: "Día de la Independencia", movable: false },
  { month: 8, day: 7, name: "Batalla de Boyacá", movable: false },
  { month: 8, day: 15, name: "Asunción de la Virgen", movable: true },
  { month: 10, day: 12, name: "Día de la Raza", movable: true },
  { month: 11, day: 1, name: "Todos los Santos", movable: true },
  { month: 11, day: 11, name: "Independencia de Cartagena", movable: true },
  { month: 12, day: 8, name: "Inmaculada Concepción", movable: false },
  { month: 12, day: 25, name: "Navidad", movable: false },
];

/** Días después de la Pascua. Los trasladables ya caen en lunes. */
const EASTER_BASED: { offset: number; name: string }[] = [
  { offset: -3, name: "Jueves Santo" },
  { offset: -2, name: "Viernes Santo" },
  { offset: 43, name: "Ascensión del Señor" },
  { offset: 64, name: "Corpus Christi" },
  { offset: 71, name: "Sagrado Corazón de Jesús" },
];

const DAY_MS = 86_400_000;

/** Domingo de Pascua (gregoriano) como fecha UTC. */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function key(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** El lunes siguiente (o el mismo día si ya es lunes). */
function nextMonday(date: Date): Date {
  const weekday = date.getUTCDay(); // 0 domingo, 1 lunes
  const add = (8 - weekday) % 7;
  return new Date(date.getTime() + add * DAY_MS);
}

/** Los festivos de un año, en orden. */
export function colombianHolidays(year: number): Holiday[] {
  const list: Holiday[] = [];
  for (const rule of FIXED) {
    if (rule.since && year < rule.since) continue;
    const date = new Date(Date.UTC(year, rule.month - 1, rule.day));
    list.push({ date: key(rule.movable ? nextMonday(date) : date), name: rule.name });
  }
  const easter = easterSunday(year).getTime();
  for (const rule of EASTER_BASED) {
    list.push({ date: key(new Date(easter + rule.offset * DAY_MS)), name: rule.name });
  }
  return list.sort((x, y) => x.date.localeCompare(y.date));
}

/** Festivos entre dos días `YYYY-MM-DD`, ambos incluidos. */
export function holidaysBetween(from: string, to: string): Holiday[] {
  const first = Number(from.slice(0, 4));
  const last = Number(to.slice(0, 4));
  const list: Holiday[] = [];
  for (let year = first; year <= last; year++) {
    list.push(...colombianHolidays(year).filter((h) => h.date >= from && h.date <= to));
  }
  return list;
}
