import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UPCOMING_STATUSES } from "@possos/booking";
import { getAgendaAppointment } from "@possos/booking/server";
import { formatDateLong, formatTimeRange, toDateKey } from "@possos/ui";
import { canActOnBarber, loadPanel } from "../../../../../../lib/panel";
import { parseDay } from "../../../../../../lib/panel-dates";
import { param } from "../../../../../../lib/session";
import { PanelHeader } from "../../../_components/panel-header";
import { RescheduleForm } from "../../../_components/reschedule-form";
import { freeStartsFor } from "../../../_lib/free-starts";

export const metadata: Metadata = { title: "Mover cita · Panel · Possos Barber" };

/** "Mover" una cita a otra hora, sin la regla de 2 horas del cliente. */
export default async function ReschedulePage({
  params,
  searchParams,
}: PageProps<"/panel/cita/[id]/mover">) {
  const { id } = await params;
  const query = await searchParams;
  const ctx = await loadPanel(`/panel/cita/${id}/mover`);
  const found = await getAgendaAppointment(ctx.db, id);
  const appointment = found.ok ? found.data : null;
  if (!appointment || !canActOnBarber(ctx, appointment.barberId)) notFound();
  const barber = ctx.barbers.find((b) => b.id === appointment.barberId)!;
  const current = toDateKey(appointment.start);
  const date = parseDay(param(query.fecha)) ?? current;
  const movable = (UPCOMING_STATUSES as readonly string[]).includes(appointment.status);
  const free = movable ? await freeStartsFor(ctx.db, barber, date) : [];

  return (
    <>
      <PanelHeader title="Mover cita" backHref={`/panel?dia=${current}&cita=${appointment.id}`} />
      <section className="mx-gutter mb-4 grid gap-1 rounded-card border border-border bg-surface p-4">
        <p className="text-label">{appointment.customerName}</p>
        <p className="text-caption text-fg-muted tabular-nums">
          {appointment.serviceName} · ahora el {formatDateLong(appointment.start)},{" "}
          {formatTimeRange(appointment.start, appointment.end)}
        </p>
      </section>
      {movable ? (
        <RescheduleForm appointmentId={appointment.id} date={date} freeStarts={free} />
      ) : (
        <p className="px-gutter text-body text-fg-muted">Esa cita ya no se puede cambiar.</p>
      )}
    </>
  );
}
