import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  canReschedule,
  MY_APPOINTMENTS_ROUTES,
  parseSelection,
  pickInitialDay,
} from "@possos/booking";
import { getAvailableDays, getAvailableStarts } from "@possos/booking/server";
import { TimePicker } from "@possos/booking/ui";
import { createClient } from "@possos/supabase/server";
import {
  formatDate,
  formatDateLong,
  formatDuration,
  formatTime,
  StepHeader,
  toDateKey,
} from "@possos/ui";
import { param } from "../../../../../lib/session";
import { loadMyAppointment } from "../../_components/my-appointments";

export const metadata: Metadata = { title: "Cambia la hora · Possos Barber" };

/**
 * "Cambiar hora", paso 1: el paso de horario de la reserva (F4) con el servicio y el barbero de
 * la cita ya puestos. La hora actual no aparece: la ocupa la misma cita. Pasado el límite, o con
 * el servicio o el barbero inactivos, vuelve a la cita (que dice qué hacer).
 */
export default async function RescheduleTimePage({
  params,
  searchParams,
}: PageProps<"/mis-citas/[id]/cambiar">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const db = await createClient();
  const appointment = await loadMyAppointment(db, id, MY_APPOINTMENTS_ROUTES.reschedule);
  if (!canReschedule(appointment, new Date())) redirect(MY_APPOINTMENTS_ROUTES.detail(id));

  const selection = parseSelection(query);
  const serviceId = appointment.serviceId;
  const barberId = appointment.barberId;
  const days = await getAvailableDays(db, { serviceId, barberId });
  const dayList = days.ok ? days.data : [];
  const today = toDateKey(new Date());

  let date =
    selection.date && dayList.some((d) => d.date === selection.date) ? selection.date : null;
  let notice: string | null = null;
  if (!date) {
    const initial = pickInitialDay(dayList, today);
    date = initial.date;
    if (initial.skippedToday) notice = `Hoy no hay horas. Te mostramos el ${formatDateLong(date)}`;
  }

  const starts = await getAvailableStarts(db, { serviceId, day: date, barberId });
  const durationMin = Math.round(
    (new Date(appointment.end).getTime() - new Date(appointment.start).getTime()) / 60_000,
  );

  return (
    <>
      <StepHeader
        step={1}
        total={2}
        name="Nueva hora"
        backHref={MY_APPOINTMENTS_ROUTES.list}
        backLabel="Mis citas"
      />
      <main className="flex flex-1 flex-col gap-6 pt-2">
        <div className="grid gap-2 px-gutter">
          <p className="text-body text-fg-muted">
            {appointment.serviceName} · {formatDuration(durationMin)} · Con {appointment.barberName}
          </p>
          <h1 className="text-title">Elige la nueva hora</h1>
          <p className="text-body text-fg-muted">
            Tu cita ahora: {formatDate(appointment.start)}, {formatTime(appointment.start)}
          </p>
        </div>
        <TimePicker
          serviceId={serviceId}
          barberId={barberId}
          days={dayList}
          date={date}
          slots={starts.ok ? starts.data : []}
          initialStartAt={selection.startAt}
          watchBarberIds={[barberId]}
          notice={notice}
          slotTaken={param(query.aviso) === "ocupada"}
          loadError={!days.ok || !starts.ok}
          paths={{
            time: MY_APPOINTMENTS_ROUTES.reschedule(id),
            confirm: MY_APPOINTMENTS_ROUTES.rescheduleConfirm(id),
          }}
        />
      </main>
    </>
  );
}
