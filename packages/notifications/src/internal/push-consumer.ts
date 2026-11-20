import type { BookingEvent } from "@possos/booking/events";
import type { EventConsumer } from "./dispatch";
import { pushKindFor, pushMessageFor, type PushAppointment, type PushFormat } from "./push-message";
import type { PushSender, PushTarget } from "./web-push";

export const PUSH_CONSUMER = "push";

/** Un evento más viejo no avisa (por ejemplo, después de horas con la app caída). */
export const PUSH_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export interface PushConsumerDeps {
  /** `get_appointment_for_notification` (booking), con el cliente de la clave secreta. */
  loadAppointment: (id: string) => Promise<PushAppointment | null | "error">;
  listTargets: (barberId: string) => Promise<PushTarget[] | null>;
  removeTargets: (endpoints: string[]) => Promise<void>;
  /** null si faltan las claves VAPID: el cursor avanza sin mandar nada. */
  send: PushSender | null;
  format: PushFormat;
  now?: () => Date;
}

/**
 * Consumidor push de booking_events: un aviso al barbero de la cita por cada reserva, cambio,
 * confirmación o cancelación de un cliente. Un push que falla no se repite (podría duplicar el
 * aviso en los otros celulares); una lectura de la base que falla, sí.
 */
export function pushConsumer(deps: PushConsumerDeps): EventConsumer {
  const now = deps.now ?? (() => new Date());
  return {
    name: PUSH_CONSUMER,
    handle: async (event: BookingEvent) => {
      const kind = pushKindFor(event);
      if (!kind || !event.appointment_id || !deps.send) return "done";
      if (now().getTime() - new Date(event.created_at).getTime() > PUSH_MAX_AGE_MS) return "done";

      const appointment = await deps.loadAppointment(event.appointment_id);
      if (appointment === "error") return "retry";
      if (!appointment) return "done";

      const targets = await deps.listTargets(event.payload.barber_id);
      if (targets === null) return "retry";
      if (targets.length === 0) return "done";

      const report = await deps.send(targets, pushMessageFor(kind, appointment, deps.format));
      if (report.gone.length > 0) await deps.removeTargets(report.gone);
      return "done";
    },
  };
}
