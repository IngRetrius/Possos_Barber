import type { BookingEvent } from "@possos/booking/events";

/**
 * Avisos push al barbero (F8): qué eventos de booking avisan y con qué texto. Puro, sin red ni
 * base, para probarlo con Vitest.
 *
 * Solo avisan los cambios que no hizo el personal: el barbero ya sabe lo que él mismo hizo en
 * el panel. Con un solo barbero, que además es el administrador, es lo mismo; si un día el
 * administrador crea citas para otro barbero, ese barbero no recibe aviso (fases/F8-entrega.md).
 */
export type PushKind =
  "created" | "pending" | "rescheduled" | "rescheduled_pending" | "cancelled" | "confirmed";

export function pushKindFor(event: BookingEvent): PushKind | null {
  if (event.version !== 1) return null;
  const p = event.payload;
  switch (event.type) {
    case "appointment.created":
      if (p.source !== "customer") return null;
      return p.status === "pending_approval" ? "pending" : "created";
    case "appointment.rescheduled":
      if (p.source !== "customer") return null;
      return p.status === "pending_approval" ? "rescheduled_pending" : "rescheduled";
    case "appointment.cancelled":
      return p.cancelled_by === "customer" ? "cancelled" : null;
    case "appointment.status_changed":
      // Confirmada por el cliente (hoy, desde el WhatsApp de F7). Aprobar, rechazar y marcar
      // asistencia son del personal.
      return p.status === "confirmed" && p.previous_status === "booked" ? "confirmed" : null;
    default:
      return null;
  }
}

const TITLES: Record<PushKind, string> = {
  created: "Nueva reserva",
  pending: "Reserva por aprobar",
  rescheduled: "Cita cambiada",
  rescheduled_pending: "Cambio por aprobar",
  cancelled: "Cita cancelada",
  confirmed: "Cita confirmada",
};

/** Lo que el aviso necesita de la cita. Es parte de `get_appointment_for_notification`. */
export interface PushAppointment {
  appointment_id: string;
  start_at: string;
  service_name: string;
  customer_name: string;
}

/** Fecha y hora en Bogotá. Las da la app (`@possos/ui`), que notifications no importa (docs/08). */
export interface PushFormat {
  /** "vie 20 nov, 3:00 p. m." */
  when: (iso: string) => string;
  /** "2026-11-20" */
  day: (iso: string) => string;
}

/** Lo que recibe el service worker (`app/sw.ts`). */
export interface PushMessage {
  title: string;
  body: string;
  /** Ruta de la app que abre el aviso. */
  url: string;
  /** Un aviso nuevo de la misma cita reemplaza al anterior. */
  tag: string;
}

/** Ruta del panel con la cita abierta en "Hoy", en el día de la cita. */
export function appointmentPanelUrl(appointmentId: string, day: string): string {
  return `/panel?dia=${day}&cita=${appointmentId}`;
}

/**
 * El texto del aviso: nombre del cliente, servicio y hora. Nunca el celular del cliente: el
 * aviso se ve en la pantalla bloqueada.
 */
export function pushMessageFor(
  kind: PushKind,
  appointment: PushAppointment,
  format: PushFormat,
): PushMessage {
  const when = format.when(appointment.start_at);
  const at = kind === "rescheduled" || kind === "rescheduled_pending" ? `ahora el ${when}` : when;
  return {
    title: TITLES[kind],
    body: `${appointment.customer_name} · ${appointment.service_name} · ${at}`,
    url: appointmentPanelUrl(appointment.appointment_id, format.day(appointment.start_at)),
    tag: `cita-${appointment.appointment_id}`,
  };
}

/** El aviso de prueba de "Más": confirma que este celular recibe avisos. */
export const TEST_PUSH_MESSAGE: PushMessage = {
  title: "Avisos activos",
  body: "Así te avisamos cuando un cliente reserve, cambie, confirme o cancele una cita.",
  url: "/panel/mas",
  tag: "prueba",
};
