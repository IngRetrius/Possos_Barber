import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  canReschedule,
  MY_APPOINTMENTS_ROUTES,
  parseSelection,
  selectionHref,
} from "@possos/booking";
import { getAvailableStarts, requiresApproval } from "@possos/booking/server";
import { AppointmentSummary, RescheduleForm } from "@possos/booking/ui";
import { createClient } from "@possos/supabase/server";
import { formatDate, formatTime, StepHeader, toDateKey } from "@possos/ui";
import { loadMyAppointment, cardContext } from "../../../_components/my-appointments";
import { rescheduleMyAppointmentAction } from "../../../actions";

export const metadata: Metadata = { title: "Confirma el cambio · Possos Barber" };

const APPROVAL = "Tu reserva queda pendiente de que el barbero la apruebe";

/**
 * "Cambiar hora", paso 2: la hora de antes, el resumen con la nueva y "Cambiar la hora". Si la
 * hora se ocupó mientras tanto, vuelve al horario con el aviso antes de que toque el botón.
 */
export default async function RescheduleConfirmPage({
  params,
  searchParams,
}: PageProps<"/mis-citas/[id]/cambiar/confirmar">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const db = await createClient();
  const appointment = await loadMyAppointment(db, id, MY_APPOINTMENTS_ROUTES.rescheduleConfirm);
  if (!canReschedule(appointment, new Date())) redirect(MY_APPOINTMENTS_ROUTES.detail(id));

  const timeHref = MY_APPOINTMENTS_ROUTES.reschedule(id);
  const startAt = parseSelection(query).startAt;
  if (!startAt) redirect(timeHref);
  const date = toDateKey(startAt);

  const [starts, approval] = await Promise.all([
    getAvailableStarts(db, {
      serviceId: appointment.serviceId,
      day: date,
      barberId: appointment.barberId,
    }),
    requiresApproval(db),
  ]);
  if (starts.ok && !starts.data.includes(startAt)) {
    redirect(selectionHref(timeHref, { date }, { aviso: "ocupada" }));
  }

  const duration = new Date(appointment.end).getTime() - new Date(appointment.start).getTime();
  const end = new Date(Date.parse(startAt) + duration).toISOString();
  const pending =
    appointment.status === "pending_approval" || (approval.ok && approval.data === true);
  const { priceLabel, location } = cardContext(appointment);

  return (
    <>
      <StepHeader
        step={2}
        total={2}
        name="Confirmar"
        backHref={selectionHref(timeHref, { date, startAt })}
      />
      <main className="grid flex-1 content-start gap-6 px-gutter pt-2 pb-8">
        <div className="grid gap-2">
          <h1 className="text-title">Revisa el cambio</h1>
          <p className="text-body text-fg-muted">
            Antes: {formatDate(appointment.start)}, {formatTime(appointment.start)}
          </p>
        </div>
        <AppointmentSummary
          serviceName={appointment.serviceName}
          start={startAt}
          end={end}
          barberName={appointment.barberName}
          priceLabel={priceLabel}
          location={location}
        />
        <p className="text-body text-fg-muted">
          Tu cita de antes se cancela y la hora queda libre para otros clientes.
        </p>
        {pending ? (
          <p
            role="note"
            className="rounded-card border border-warning px-4 py-3 text-body text-warning"
          >
            {APPROVAL}
          </p>
        ) : null}
      </main>
      <RescheduleForm
        action={rescheduleMyAppointmentAction}
        appointmentId={id}
        date={date}
        startAt={startAt}
        summary={`${formatDate(startAt)} · ${formatTime(startAt)}`}
      />
    </>
  );
}
