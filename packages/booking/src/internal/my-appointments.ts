/*
 * "Mis citas" (F5): qué citas del cliente van arriba, cuáles al historial y qué puede hacer con
 * cada una. Sin efectos: lo usan el servidor y el navegador. La política de 2 h la decide la base
 * (`change_deadline` sale de `cancel_window_min` en `list_my_appointments`); aquí solo se decide
 * qué botones mostrar. No importa ./index para que dependency-cruiser no vea un ciclo.
 */
import { DEFAULT_LOCALE, type Locale } from "@possos/config/constants";
import { formatTime, type StatusTone } from "@possos/ui";
import { messages } from "../messages";
import type { Enums } from "@possos/supabase";
import { APPOINTMENT_STATUS_DISPLAY } from "./status";

type AppointmentStatus = Enums<"appointment_status">;

/** Una cita del cliente de la sesión (`list_my_appointments`). Fechas en ISO. */
export interface MyAppointment {
  id: string;
  status: AppointmentStatus;
  start: string;
  end: string;
  serviceId: string;
  serviceName: string;
  /** Si el servicio se puede reservar todavía. */
  serviceActive: boolean;
  barberId: string;
  barberName: string;
  barberActive: boolean;
  /** Enlace de WhatsApp del barbero, o null si no lo ha puesto. */
  barberWhatsappUrl: string | null;
  priceCop: number | null;
  /** Hasta cuándo el cliente puede cancelarla o cambiarla (inicio menos `cancel_window_min`). */
  changeDeadline: string;
  /** La cita que la reemplazó al reprogramarla, o null. */
  replacedBy: string | null;
}

const UPCOMING: readonly AppointmentStatus[] = ["pending_approval", "booked", "confirmed"];

const ms = (iso: string) => new Date(iso).getTime();

/** Todavía va a pasar (o está pasando): pendiente, reservada o confirmada y sin terminar. */
export function isUpcoming(appointment: MyAppointment, now: Date): boolean {
  return UPCOMING.includes(appointment.status) && ms(appointment.end) > now.getTime();
}

/** Dentro del límite: puede cancelarla o cambiarla desde la app. */
export function canChange(appointment: MyAppointment, now: Date): boolean {
  return isUpcoming(appointment, now) && now.getTime() < ms(appointment.changeDeadline);
}

/**
 * Puede cambiar la hora: dentro del límite y con el servicio y el barbero activos (si no,
 * `reschedule_appointment` no encontraría horas). Cancelar sí puede.
 */
export function canReschedule(appointment: MyAppointment, now: Date): boolean {
  return canChange(appointment, now) && appointment.serviceActive && appointment.barberActive;
}

/** Próximas (la más cercana primero) e historial (la más reciente primero). */
export function splitMyAppointments(
  appointments: MyAppointment[],
  now: Date,
): { upcoming: MyAppointment[]; past: MyAppointment[] } {
  const upcoming = appointments
    .filter((a) => isUpcoming(a, now))
    .sort((a, b) => ms(a.start) - ms(b.start));
  const past = appointments
    .filter((a) => !isUpcoming(a, now))
    .sort((a, b) => ms(b.start) - ms(a.start));
  return { upcoming, past };
}

/**
 * Estado para el cliente. Una cita que ya pasó y el barbero no ha marcado sigue "reservada" en
 * la base; "Sin confirmar" o "Por cerrar" no le dicen nada al cliente, así que dice "Pasada".
 */
export function myStatusDisplay(
  appointment: MyAppointment,
  now: Date,
  locale: Locale = DEFAULT_LOCALE,
): { label: string; tone: StatusTone } {
  if (UPCOMING.includes(appointment.status) && !isUpcoming(appointment, now)) {
    return { label: messages[locale].status.past, tone: "neutral" };
  }
  return APPOINTMENT_STATUS_DISPLAY[locale][appointment.status];
}

/** "a las 3:00 p. m." o, a la una, "a la 1:00 p. m."; en inglés, "at 3:00 PM". */
export function atTime(iso: string, locale: Locale = DEFAULT_LOCALE): string {
  const time = formatTime(iso, locale);
  if (locale === "en") return `at ${time}`;
  return `${time.startsWith("1:") ? "a la" : "a las"} ${time}`;
}

/** Rutas de "Mis citas". Viven en `apps/web/app/(customer)/mis-citas`. */
export const MY_APPOINTMENTS_ROUTES = {
  list: "/mis-citas",
  detail: (id: string) => `/mis-citas/${id}`,
  reschedule: (id: string) => `/mis-citas/${id}/cambiar`,
  rescheduleConfirm: (id: string) => `/mis-citas/${id}/cambiar/confirmar`,
  /** "Agregar al calendario": manda al .ics o a Google Calendar según el teléfono. */
  calendar: (id: string) => `/mis-citas/${id}/calendario`,
  calendarFile: (id: string) => `/mis-citas/${id}/calendario.ics`,
} as const;
