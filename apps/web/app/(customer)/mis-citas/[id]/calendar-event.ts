import { getViewer } from "@possos/auth/server";
import { type IcsEvent, MY_APPOINTMENTS_ROUTES } from "@possos/booking";
import { getMyAppointment } from "@possos/booking/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@possos/supabase/server";
import { BUSINESS, siteUrl } from "../../../../lib/business";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * La cita como evento de calendario, para el .ics y para Google Calendar. Solo para el cliente
 * dueño de la cita (`list_my_appointments`); sin sesión, el proxy manda a ingresar. Si la cita se
 * reprogramó, devuelve el id de la nueva para redirigir.
 */
export async function loadCalendarEvent(
  id: string,
): Promise<{ event: IcsEvent } | { replacedBy: string } | { error: Response }> {
  if (!UUID.test(id)) return { error: new Response("No encontrado", { status: 404 }) };

  const db = await createClient();
  const viewer = await getViewer(db);
  if (!viewer) return { error: new Response("Ingresa para continuar", { status: 401 }) };

  const result = await getMyAppointment(db, id);
  if (!result.ok || !result.data) return { error: new Response("No encontrado", { status: 404 }) };
  const appt = result.data;
  if (appt.replacedBy) return { replacedBy: appt.replacedBy };

  const detail = new URL(MY_APPOINTMENTS_ROUTES.detail(id), siteUrl()).toString();
  const t = await getTranslations("web.customer.calendar");
  return {
    event: {
      id,
      start: appt.start,
      end: appt.end,
      title: t("title", { service: appt.serviceName, business: BUSINESS.name }),
      description: [
        t("with", { barber: appt.barberName }),
        BUSINESS.addressReference ? `${BUSINESS.addressReference}.` : null,
        t("policy"),
        t("link", { url: detail }),
      ]
        .filter(Boolean)
        .join(" "),
      location: BUSINESS.address ? `${BUSINESS.address}, ${BUSINESS.city}` : BUSINESS.city,
      url: detail,
      alarmMinutes: 60,
    },
  };
}

/** Redirección que no se guarda en caché (depende del teléfono). Las rutas propias van relativas. */
export function redirect(location: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: location, "Cache-Control": "private, no-store" },
  });
}
