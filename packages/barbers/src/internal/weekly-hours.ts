/*
 * Horario semanal en el panel: rangos por día, en hora de Bogotá. La base valida otra vez con
 * `set_working_hours`; esto da el error junto al campo antes de enviarlo.
 * No importa ./index para que dependency-cruiser no vea un ciclo.
 */

export interface WeeklyRange {
  /** ISO: 1 lunes, 7 domingo. */
  weekday: number;
  /** `HH:MM`. */
  start_time: string;
  end_time: string;
}

export type WeeklyHoursError = "INVALID_RANGE" | "HOURS_OVERLAP";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** `HH:MM:SS` de la base a `HH:MM`. */
export function toHourMinute(time: string): string {
  return time.slice(0, 5);
}

/** Rangos del formulario: campos `rango` con valor `weekday|HH:MM|HH:MM`. */
export function parseWeeklyRanges(values: string[]): WeeklyRange[] {
  return values.flatMap((value) => {
    const [weekday, start, end] = value.split("|");
    const day = Number(weekday);
    if (!Number.isInteger(day) || !start || !end) return [];
    return [{ weekday: day, start_time: start, end_time: end }];
  });
}

/**
 * Errores por día (1 a 7). Un rango vale si sus horas tienen forma `HH:MM` y termina después de
 * empezar. Dos rangos del mismo día no se cruzan, aunque sí pueden tocarse.
 */
export function validateWeeklyRanges(ranges: WeeklyRange[]): Map<number, WeeklyHoursError> {
  const errors = new Map<number, WeeklyHoursError>();
  for (let day = 1; day <= 7; day++) {
    const today = ranges
      .filter((r) => r.weekday === day)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
    if (
      today.some(
        (r) => !TIME.test(r.start_time) || !TIME.test(r.end_time) || r.end_time <= r.start_time,
      )
    ) {
      errors.set(day, "INVALID_RANGE");
      continue;
    }
    if (today.some((r, i) => i > 0 && r.start_time < today[i - 1]!.end_time)) {
      errors.set(day, "HOURS_OVERLAP");
    }
  }
  for (const range of ranges) {
    if (!Number.isInteger(range.weekday) || range.weekday < 1 || range.weekday > 7) {
      errors.set(0, "INVALID_RANGE");
    }
  }
  return errors;
}

export const WEEKLY_HOURS_MESSAGES: Record<WeeklyHoursError, string> = {
  INVALID_RANGE: "Cada rango debe terminar después de empezar",
  HOURS_OVERLAP: "Dos rangos de este día se cruzan",
};
