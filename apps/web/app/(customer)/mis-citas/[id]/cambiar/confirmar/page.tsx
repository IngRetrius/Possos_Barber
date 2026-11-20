import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  canReschedule,
  MY_APPOINTMENTS_ROUTES,
  parseSelection,
  selectionHref,
} from "@possos/booking";
import { getAvailableStarts, requiresApproval } from "@possos/booking/server";
import { AppointmentSummary, RescheduleForm } from "@possos/booking/ui";
import { createClient } from "@possos/supabase/server";
import { StepHeader, toDateKey } from "@possos/ui";
import { currentFormatters } from "../../../../../../lib/i18n";
import { LocaleSwitch } from "../../../../../_components/locale-switch";
import { loadMyAppointment, cardContext } from "../../../_components/my-appointments";
import { rescheduleMyAppointmentAction } from "../../../actions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("web.customer.meta"))("rescheduleConfirm") };
}

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
  const t = await getTranslations("web.customer");
  const f = await currentFormatters();
  const { priceLabel, location } = cardContext(
    appointment,
    f.locale,
    t("myAppointments.instagram"),
  );

  return (
    <>
      <StepHeader
        step={2}
        total={2}
        name={t("reschedule.confirmStep")}
        backHref={selectionHref(timeHref, { date, startAt })}
        actions={<LocaleSwitch />}
      />
      <main className="grid flex-1 content-start gap-6 px-gutter pt-2 pb-8">
        <div className="grid gap-2">
          <h1 className="text-title">{t("reschedule.confirmTitle")}</h1>
          <p className="text-body text-fg-muted">
            {t("reschedule.before", {
              when: `${f.date(appointment.start)}, ${f.time(appointment.start)}`,
            })}
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
        <p className="text-body text-fg-muted">{t("reschedule.oldCancelled")}</p>
        {pending ? (
          <p
            role="note"
            className="rounded-card border border-warning px-4 py-3 text-body text-warning"
          >
            {t("approval")}
          </p>
        ) : null}
      </main>
      <RescheduleForm
        action={rescheduleMyAppointmentAction}
        appointmentId={id}
        date={date}
        startAt={startAt}
        summary={`${f.date(startAt)} · ${f.time(startAt)}`}
      />
    </>
  );
}
