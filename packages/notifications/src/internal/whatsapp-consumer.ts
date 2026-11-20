import type { BookingEvent } from "@possos/booking/events";
import type { EventConsumer } from "./dispatch";
import { TEMPLATES, type TemplateName, type WhatsappAppointment } from "./whatsapp-templates";

export const WHATSAPP_CONSUMER = "whatsapp";

/**
 * La confirmación ("Tu cita quedó para...") solo tiene sentido poco después de reservar. Si el
 * despacho estuvo caído más que esto, se omite; los recordatorios sí se programan.
 */
export const CONFIRMATION_MAX_AGE_MS = 2 * 60 * 60 * 1000;

/** Las columnas de notification_settings que usa WhatsApp. */
export interface WhatsappSettings {
  reminder_offsets_min: number[];
  send_confirmation: boolean;
  send_cancellation: boolean;
}

export type JobKind = "confirmation" | "reminder" | "cancellation";

/** Una fila nueva de message_jobs. */
export interface NewMessageJob {
  appointment_id: string;
  kind: JobKind;
  /** Minutos antes de la cita; 0 si no es recordatorio. */
  offset_min: number;
  template: TemplateName;
  /** ISO 8601. */
  send_at: string;
}

/** Estados en que una cita recibe mensajes (las pendientes de aprobación todavía no). */
export const ACTIVE_STATUSES = ["booked", "confirmed"];

/**
 * Los trabajos de una cita activa (puro, para Vitest). La confirmación sale ya; cada recordatorio
 * sale `offset` minutos antes de la cita y no se crea si esa hora ya pasó (docs/03: con menos de
 * 24 h no hay recordatorio de 24 h). El recordatorio más lejano lleva los botones (plantilla
 * recordatorio_24h) y los demás, la dirección (recordatorio_2h).
 */
export function planJobs(
  appointment: { appointment_id: string; start_at: string },
  settings: WhatsappSettings,
  now: Date,
  withConfirmation: boolean,
): NewMessageJob[] {
  const start = new Date(appointment.start_at).getTime();
  if (!(start > now.getTime())) return [];
  const jobs: NewMessageJob[] = [];

  if (withConfirmation && settings.send_confirmation) {
    jobs.push({
      appointment_id: appointment.appointment_id,
      kind: "confirmation",
      offset_min: 0,
      template: TEMPLATES.confirmation,
      send_at: now.toISOString(),
    });
  }

  const offsets = [...new Set(settings.reminder_offsets_min.filter((m) => m > 0))].sort(
    (a, b) => b - a,
  );
  offsets.forEach((offset, index) => {
    const sendAt = start - offset * 60_000;
    if (sendAt <= now.getTime()) return;
    jobs.push({
      appointment_id: appointment.appointment_id,
      kind: "reminder",
      offset_min: offset,
      template: index === 0 ? TEMPLATES.firstReminder : TEMPLATES.lastReminder,
      send_at: new Date(sendAt).toISOString(),
    });
  });
  return jobs;
}

export interface WhatsappConsumerDeps {
  /** false si faltan el token o el número: el cursor avanza sin programar nada. */
  enabled: boolean;
  /** `get_appointment_for_notification` (booking), con la clave secreta. */
  loadAppointment: (id: string) => Promise<WhatsappAppointment | null | "error">;
  loadSettings: () => Promise<WhatsappSettings | null>;
  jobs: {
    /** Crea los trabajos; los que ya existen (único por cita, tipo y minutos) se ignoran. */
    create: (jobs: NewMessageJob[]) => Promise<boolean>;
    /** Pasa a `skipped` los trabajos programados de una cita. */
    skipPending: (appointmentId: string) => Promise<boolean>;
  };
  now?: () => Date;
}

/**
 * Consumidor whatsapp de booking_events (F7). Programa y descarta trabajos; el envío es de
 * `dispatchDue`. Tolera ver un evento dos veces: los trabajos son únicos por (cita, tipo, minutos,
 * canal) y descartar es idempotente. Antes de programar vuelve a leer la cita, así que un evento
 * viejo de una cita que después se canceló no programa nada.
 */
export function whatsappConsumer(deps: WhatsappConsumerDeps): EventConsumer {
  const now = deps.now ?? (() => new Date());

  /** Programa los mensajes de una cita, si sigue activa y el cliente los aceptó. */
  const schedule = async (appointmentId: string, event: BookingEvent) => {
    const appointment = await deps.loadAppointment(appointmentId);
    if (appointment === "error") return "retry" as const;
    if (!appointment || !ACTIVE_STATUSES.includes(appointment.status)) return "done" as const;
    if (!appointment.whatsapp_opt_in || !appointment.customer_phone) return "done" as const;

    const settings = await deps.loadSettings();
    if (!settings) return "retry" as const;

    const fresh = now().getTime() - new Date(event.created_at).getTime() <= CONFIRMATION_MAX_AGE_MS;
    const jobs = planJobs(appointment, settings, now(), fresh);
    if (jobs.length === 0) return "done" as const;
    return (await deps.jobs.create(jobs)) ? ("done" as const) : ("retry" as const);
  };

  /** El aviso de que el personal canceló la cita, si el administrador lo activó. */
  const notifyCancellation = async (appointmentId: string, event: BookingEvent) => {
    if (now().getTime() - new Date(event.created_at).getTime() > CONFIRMATION_MAX_AGE_MS) {
      return "done" as const;
    }
    const settings = await deps.loadSettings();
    if (!settings) return "retry" as const;
    if (!settings.send_cancellation) return "done" as const;

    const appointment = await deps.loadAppointment(appointmentId);
    if (appointment === "error") return "retry" as const;
    if (!appointment || appointment.status !== "cancelled") return "done" as const;
    if (!appointment.whatsapp_opt_in || !appointment.customer_phone) return "done" as const;
    if (new Date(appointment.start_at).getTime() <= now().getTime()) return "done" as const;

    const created = await deps.jobs.create([
      {
        appointment_id: appointmentId,
        kind: "cancellation",
        offset_min: 0,
        template: TEMPLATES.cancellation,
        send_at: now().toISOString(),
      },
    ]);
    return created ? ("done" as const) : ("retry" as const);
  };

  return {
    name: WHATSAPP_CONSUMER,
    handle: async (event: BookingEvent) => {
      if (!deps.enabled || event.version !== 1 || !event.appointment_id) return "done";
      const id = event.appointment_id;
      const p = event.payload;

      switch (event.type) {
        case "appointment.created":
          return schedule(id, event);
        case "appointment.rescheduled":
          // La cita anterior quedó cancelada sin evento propio: sus trabajos se descartan aquí.
          if (p.rescheduled_from && !(await deps.jobs.skipPending(p.rescheduled_from))) {
            return "retry";
          }
          return schedule(id, event);
        case "appointment.cancelled":
          if (!(await deps.jobs.skipPending(id))) return "retry";
          // Si canceló el cliente, ya lo sabe.
          return p.cancelled_by === "staff" ? notifyCancellation(id, event) : "done";
        case "appointment.status_changed":
          if (p.status === "booked" && p.previous_status === "pending_approval") {
            // Aprobada: ahora sí recibe la confirmación y los recordatorios.
            return schedule(id, event);
          }
          if (!ACTIVE_STATUSES.includes(p.status)) {
            // Rechazada, atendida o no vino: lo que faltaba ya no sirve.
            return (await deps.jobs.skipPending(id)) ? "done" : "retry";
          }
          return "done";
        default:
          return "done";
      }
    },
  };
}
