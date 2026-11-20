import "server-only";
import { getAppointmentForNotification } from "@possos/booking/server";
import {
  dispatchBookingEvents,
  pushConsumer,
  pushTargets,
  vapidFromEnv,
  webPushSender,
  type ConsumerReport,
} from "@possos/notifications/server";
import { createAdminClient } from "@possos/supabase/admin";
import { formatDate, formatTime, toDateKey } from "@possos/ui";
import { pushSubject } from "./business";

const log = (message: string, detail?: unknown) =>
  console.error(`[despacho] ${message}`, detail ?? "");

/**
 * Composición del despacho de booking_events (F8): la app junta booking (la cita, con la clave
 * secreta), ui (fechas en Bogotá) y notifications (cursor y push). F7 agrega aquí su consumidor
 * de WhatsApp a la lista; la ruta, el cursor y el aviso de la base no cambian.
 */
export async function runDispatch(): Promise<Record<string, ConsumerReport>> {
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

  return dispatchBookingEvents(admin, [push], log);
}
