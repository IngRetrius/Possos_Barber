import { calendarTarget, googleCalendarUrl, MY_APPOINTMENTS_ROUTES } from "@possos/booking";
import { loadCalendarEvent, redirect } from "../calendar-event";

/**
 * "Agregar al calendario". En iPhone, iPad y Mac manda al .ics, que Safari abre en Calendario;
 * en Android y lo demás, a Google Calendar con la cita llena. El evento queda en la cuenta de
 * Google del cliente y aparece en la app del celular.
 */
export async function GET(request: Request, ctx: RouteContext<"/mis-citas/[id]/calendario">) {
  const { id } = await ctx.params;
  if (calendarTarget(request.headers.get("user-agent")) === "ics") {
    return redirect(MY_APPOINTMENTS_ROUTES.calendarFile(id));
  }

  const loaded = await loadCalendarEvent(id);
  if ("error" in loaded) return loaded.error;
  if ("replacedBy" in loaded) {
    return redirect(MY_APPOINTMENTS_ROUTES.calendar(loaded.replacedBy));
  }
  return redirect(googleCalendarUrl(loaded.event));
}
