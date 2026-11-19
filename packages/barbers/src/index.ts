/**
 * API pública de @possos/barbers: barberos, horario, bloqueos y portafolio.
 * Solo se exporta lo que otros módulos necesitan. Lo interno va en src/internal/ (docs/08).
 */
import type { Tables } from "@possos/supabase";

export type Barber = Tables<"barbers">;
export type BarberService = Tables<"barber_services">;
/** Rango del horario semanal en hora local de Bogotá. `weekday` es ISO: 1 lunes, 7 domingo. */
export type WorkingHours = Tables<"working_hours">;
/** Bloqueo del barbero. `period` es un tstzrange semiabierto `[inicio, fin)`. */
export type TimeOff = Tables<"time_off">;
export type PortfolioItem = Tables<"portfolio_items">;

export {
  formatTimeOfDay,
  groupOpeningHours,
  WEEKDAY_NAMES,
  type OpeningHoursGroup,
  type OpeningRange,
} from "./internal/hours";
export { BARBERS_ERROR_CODES, barbersErrorMessage, type BarbersErrorCode } from "./internal/errors";
export { colombianHolidays, holidaysBetween, type Holiday } from "./internal/holidays";
export {
  IMAGE_ACCEPT,
  IMAGE_MAX_SIDE,
  isOwnImagePath,
  newImagePath,
  type ImageBucket,
} from "./internal/images";
export {
  MAX_BARBER_NAME,
  MAX_BIO,
  normalizeWhatsappUrl,
  SLOT_INTERVALS,
  validateBarberProfile,
  type BarberProfileErrors,
  type BarberProfileField,
  type BarberProfileInput,
  type ValidBarberProfile,
} from "./internal/profile";
export {
  parseWeeklyRanges,
  toHourMinute,
  validateWeeklyRanges,
  WEEKLY_HOURS_MESSAGES,
  type WeeklyHoursError,
  type WeeklyRange,
} from "./internal/weekly-hours";
