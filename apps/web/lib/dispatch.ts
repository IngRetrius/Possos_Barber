import "server-only";
import { getAppointmentForNotification } from "@possos/booking/server";
import {
  dispatchBookingEvents,
  dispatchDue,
  getWhatsappSettings,
  messageJobStore,
  pushConsumer,
  pushTargets,
  vapidFromEnv,
  webPushSender,
  whatsappAppointmentLoader,
  whatsappConsumer,
  type ConsumerReport,
  type DueReport,
} from "@possos/notifications/server";
import { createAdminClient } from "@possos/supabase/admin";
import { formatDate, formatTime, toDateKey } from "@possos/ui";
import { pushSubject } from "./business";
import { whatsappClient, whatsappContext } from "./whatsapp";

const log = (message: string, detail?: unknown) =>
  console.error(`[despacho] ${message}`, detail ?? "");

export interface DispatchReport {
  consumers: Record<string, ConsumerReport>;
  /** Mensajes de WhatsApp vencidos que se mandaron en este despacho (F7). */
  whatsapp: DueReport;
}

/**
 * Composición del despacho de booking_events (F8) y de los mensajes de WhatsApp vencidos (F7): la
 * app junta booking (la cita, con la clave secreta), ui (fechas en Bogotá) y notifications
 * (cursores, push y WhatsApp). La ruta, los cursores y el aviso de la base no cambian.
 */
export async function runDispatch(): Promise<DispatchReport> {
  const admin = createAdminClient();
  const vapid = vapidFromEnv(pushSubject());
  if (!vapid) log("Faltan las claves VAPID: el cursor push avanza sin mandar avisos");

  const push = pushConsumer({
    loadAppointment: async (id) => {
      const result = await getAppointmentForNotification(admin, id);
      return result.ok ? result.data : "error";
    },
    ...pushTargets(admin),
    send: vapid ? webPushSender(vapid, log) : null,
    format: {
      when: (iso) => `${formatDate(iso)}, ${formatTime(iso)}`,
      day: (iso) => toDateKey(iso),
    },
  });

  // Sin token o sin número de Meta, el cursor whatsapp avanza sin programar mensajes.
  const client = whatsappClient();
  const jobs = messageJobStore(admin);
  const loadAppointment = whatsappAppointmentLoader(admin);
  const whatsapp = whatsappConsumer({
    enabled: client !== null,
    loadAppointment,
    loadSettings: () => getWhatsappSettings(admin),
    jobs,
  });

  // Primero los eventos (una reserva nueva crea su confirmación) y después lo vencido, así la
  // confirmación sale en el mismo despacho que pidió la reserva.
  const consumers = await dispatchBookingEvents(admin, [push, whatsapp], log);
  const due = await dispatchDue({ jobs, loadAppointment, client, context: whatsappContext(), log });
  return { consumers, whatsapp: due };
}
