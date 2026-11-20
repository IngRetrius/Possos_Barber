import { appointmentIcs, MY_APPOINTMENTS_ROUTES } from "@possos/booking";
import { loadCalendarEvent, redirect } from "../calendar-event";

/**
 * La cita como archivo .ics, con las horas en UTC (el calendario las muestra en la hora del
 * teléfono) y la dirección. "Agregar al calendario" llega aquí desde iPhone, iPad y Mac
 * (`/calendario`).
 */
export async function GET(_request: Request, ctx: RouteContext<"/mis-citas/[id]/calendario.ics">) {
  const { id } = await ctx.params;
  const loaded = await loadCalendarEvent(id);
  if ("error" in loaded) return loaded.error;
  if ("replacedBy" in loaded) {
    return redirect(MY_APPOINTMENTS_ROUTES.calendarFile(loaded.replacedBy));
  }

  return new Response(appointmentIcs(loaded.event), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="cita-possos-barber.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
