import { getViewer } from "@possos/auth/server";
import { appointmentIcs, MY_APPOINTMENTS_ROUTES } from "@possos/booking";
import { getMyAppointment } from "@possos/booking/server";
import { createClient } from "@possos/supabase/server";
import { BUSINESS, siteUrl } from "../../../../../lib/business";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * "Agregar al calendario": la cita como archivo .ics, con las horas en UTC (el calendario las
 * muestra en la hora del teléfono) y la dirección. Solo para el cliente dueño de la cita
 * (`list_my_appointments`); sin sesión, el proxy manda a ingresar. Si la cita se reprogramó,
 * entrega la nueva.
 */
export async function GET(_request: Request, ctx: RouteContext<"/mis-citas/[id]/calendario.ics">) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return new Response("No encontrado", { status: 404 });

  const db = await createClient();
  const viewer = await getViewer(db);
  if (!viewer) return new Response("Ingresa para continuar", { status: 401 });

  const result = await getMyAppointment(db, id);
  if (!result.ok || !result.data) return new Response("No encontrado", { status: 404 });
  const appt = result.data;
  if (appt.replacedBy) {
    return Response.redirect(new URL(MY_APPOINTMENTS_ROUTES.calendar(appt.replacedBy), siteUrl()));
  }

  const ics = appointmentIcs({
    id,
    start: appt.start,
    end: appt.end,
    title: `${appt.serviceName} en ${BUSINESS.name}`,
    description: [
      `Con ${appt.barberName}.`,
      BUSINESS.addressReference ? `${BUSINESS.addressReference}.` : null,
      "Puedes cancelar o cambiar tu cita hasta 2 horas antes.",
      `Tu cita: ${new URL(MY_APPOINTMENTS_ROUTES.detail(id), siteUrl())}`,
    ]
      .filter(Boolean)
      .join(" "),
    location: BUSINESS.address ? `${BUSINESS.address}, ${BUSINESS.city}` : BUSINESS.city,
    url: new URL(MY_APPOINTMENTS_ROUTES.detail(id), siteUrl()).toString(),
    alarmMinutes: 60,
  });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="cita-possos-barber.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
