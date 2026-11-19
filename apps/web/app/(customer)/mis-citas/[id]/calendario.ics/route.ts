import { getViewer } from "@possos/auth/server";
import { listActiveBarbers } from "@possos/barbers/server";
import { appointmentIcs, parsePeriod } from "@possos/booking";
import { getAppointment } from "@possos/booking/server";
import { listActiveServices } from "@possos/catalog/server";
import { createClient } from "@possos/supabase/server";
import { BUSINESS, siteUrl } from "../../../../../lib/business";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * "Agregar al calendario": la cita como archivo .ics. Solo la ve su dueño (RLS de appointments);
 * sin sesión, el proxy manda a ingresar.
 */
export async function GET(_request: Request, ctx: RouteContext<"/mis-citas/[id]/calendario.ics">) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return new Response("No encontrado", { status: 404 });

  const db = await createClient();
  const viewer = await getViewer(db);
  if (!viewer) return new Response("Ingresa para continuar", { status: 401 });

  const [appointment, services, barbers] = await Promise.all([
    getAppointment(db, id),
    listActiveServices(db),
    listActiveBarbers(db),
  ]);
  const period = appointment.ok && appointment.data ? parsePeriod(appointment.data.period) : null;
  if (!appointment.ok || !appointment.data || !period) {
    return new Response("No encontrado", { status: 404 });
  }

  const appt = appointment.data;
  const service = services.ok ? services.data.find((s) => s.id === appt.service_id) : undefined;
  const barber = barbers.ok ? barbers.data.find((b) => b.id === appt.barber_id) : undefined;

  const ics = appointmentIcs({
    id,
    start: period.start,
    end: period.end,
    title: `${service?.name ?? "Cita"} en ${BUSINESS.name}`,
    description: [
      barber ? `Con ${barber.display_name}.` : null,
      "Puedes cancelar o cambiar tu cita hasta 2 horas antes.",
    ]
      .filter(Boolean)
      .join(" "),
    location: BUSINESS.address ? `${BUSINESS.address}, ${BUSINESS.city}` : BUSINESS.city,
    url: siteUrl(),
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
