/**
 * API pública de @possos/booking: disponibilidad, reservar, cancelar, reprogramar, estados y eventos.
 * Solo se exporta lo que otros módulos necesitan. Lo interno va en src/internal/ (docs/08).
 */
import type { Database, Enums, Tables } from "@possos/supabase";

/** Una cita. `period` es un tstzrange semiabierto `[inicio, fin)`; ver no_double_booking. */
export type Appointment = Tables<"appointments">;
export type AppointmentStatus = Enums<"appointment_status">;
export type BookingSettings = Tables<"booking_settings">;
export type CustomerBookingStatus = Tables<"customer_booking_status">;

type Fn = Database["public"]["Functions"];
/** Una hora libre: inicio en ISO 8601 y los barberos libres a esa hora. Sin datos de clientes. */
export type AvailableSlot = Fn["get_available_slots"]["Returns"][number];
export type ConflictingAppointment = Fn["list_conflicting_appointments"]["Returns"][number];
/** Contrato para notifications: lo único que necesita para enviar un mensaje. */
export type AppointmentForNotification = Fn["get_appointment_for_notification"]["Returns"][number];
export type ConfirmVia = "customer" | "staff" | "whatsapp";

/** Estados que ocupan el horario (entran en la restricción de exclusión). */
export const OCCUPYING_STATUSES = [
  "pending_approval",
  "booked",
  "confirmed",
  "completed",
  "no_show",
] as const satisfies readonly AppointmentStatus[];

/** Estados de una cita que todavía va a pasar (la del cliente que espera su turno). */
export const UPCOMING_STATUSES = [
  "pending_approval",
  "booked",
  "confirmed",
] as const satisfies readonly AppointmentStatus[];

/** Días de la tira con su número de horas libres (`get_available_days`). */
export type { DayAvailability } from "./internal/selection";

export { parsePeriod } from "./internal/period";
export {
  addDays,
  bogotaInstant,
  buildDayAgenda,
  dayBounds,
  dayOccupancy,
  isoWeekday,
  isToClose,
  weekStart,
  type AgendaAppointment,
  type AgendaBlock,
  type AgendaItem,
  type AgendaRange,
  type DayAgendaInput,
} from "./internal/agenda";
export {
  ANY_BARBER,
  BOOKING_ROUTES,
  BOOKING_STEP_NAMES,
  bookingSteps,
  nextDayWithSlots,
  normalizeInstant,
  parseSelection,
  pickInitialDay,
  selectionHref,
  stepPosition,
  type BookingSelection,
  type BookingStep,
} from "./internal/selection";
export {
  appointmentIcs,
  calendarTarget,
  escapeIcsText,
  googleCalendarUrl,
  type IcsEvent,
} from "./internal/ics";
export {
  groupQuickSlots,
  pickQuickDays,
  QUICK_SLOTS_DAYS,
  QUICK_SLOTS_LIMIT,
  type QuickSlotDay,
} from "./internal/quick-slots";
export { APPOINTMENT_STATUS_DISPLAY, TO_CLOSE_DISPLAY } from "./internal/status";
export {
  canChange,
  canReschedule,
  isUpcoming,
  MY_APPOINTMENTS_ROUTES,
  myStatusDisplay,
  splitMyAppointments,
  type MyAppointment,
} from "./internal/my-appointments";
export { BOOKING_ERROR_CODES, bookingErrorMessage, type BookingErrorCode } from "./internal/errors";
export {
  validateBookingSettings,
  type BookingSettingsErrors,
  type BookingSettingsField,
  type BookingSettingsInput,
  type ValidBookingSettings,
} from "./internal/settings";
