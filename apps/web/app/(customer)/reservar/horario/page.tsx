import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  ANY_BARBER,
  BOOKING_ROUTES,
  parseSelection,
  pickInitialDay,
  selectionHref,
  stepPosition,
} from "@possos/booking";
import { getAvailableDays, getAvailableStarts } from "@possos/booking/server";
import { TimePicker } from "@possos/booking/ui";
import { createClient } from "@possos/supabase/server";
import { formatDuration, StepHeader, toDateKey } from "@possos/ui";
import {
  barberName,
  loadBookingFlow,
  missingStepHref,
  previousStepHref,
} from "../../../../lib/booking-flow";
import { currentFormatters } from "../../../../lib/i18n";
import { param } from "../../../../lib/session";
import { LocaleSwitch } from "../../../_components/locale-switch";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("web.customer.meta"))("time") };
}

/**
 * Paso "Horario": hoy elegido por omisión (o el primer día con horas) y las horas libres de
 * `get_available_slots`. Las horas se vuelven a pedir con cada aviso de Broadcast.
 */
export default async function TimeStepPage({ searchParams }: PageProps<"/reservar/horario">) {
  const params = await searchParams;
  const t = await getTranslations("web.customer");
  const f = await currentFormatters();
  const selection = parseSelection(params);
  const db = await createClient();
  const flow = await loadBookingFlow(db, selection);
  const missing = missingStepHref(flow);
  if (missing) redirect(missing);

  const service = flow.service!;
  const barberId = flow.barberId!;
  const rpcBarberId = barberId === ANY_BARBER ? undefined : barberId;

  const days = await getAvailableDays(db, { serviceId: service.id, barberId: rpcBarberId });
  const dayList = days.ok ? days.data : [];
  const today = toDateKey(new Date());

  let date =
    selection.date && dayList.some((d) => d.date === selection.date) ? selection.date : null;
  let notice: string | null = null;
  if (!date) {
    const initial = pickInitialDay(dayList, today);
    date = initial.date;
    if (initial.skippedToday) notice = t("skippedToday", { date: f.dateLong(date) });
  }

  const starts = await getAvailableStarts(db, {
    serviceId: service.id,
    day: date,
    barberId: rpcBarberId,
  });

  const position = stepPosition("time", flow.steps);
  const name = barberName(flow, barberId);
  return (
    <>
      <StepHeader
        actions={<LocaleSwitch />}
        {...position}
        backHref={previousStepHref(flow, "time", selection)}
      />
      <main className="flex flex-1 flex-col gap-6 pt-2">
        <div className="grid gap-2 px-gutter">
          <div className="flex items-center justify-between gap-4">
            <p className="text-body text-fg-muted">
              {service.name} · {formatDuration(service.duration_min)}
              {flow.barbers.length > 1 ? ` · ${name ?? t("anyBarber")}` : null}
            </p>
            {flow.services.length > 1 ? (
              <Link
                href={BOOKING_ROUTES.service}
                className="inline-flex min-h-12 items-center text-label text-fg underline underline-offset-4"
              >
                {t("change")}
              </Link>
            ) : flow.barbers.length > 1 ? (
              <Link
                href={selectionHref(BOOKING_ROUTES.barber, { serviceId: service.id })}
                className="inline-flex min-h-12 items-center text-label text-fg underline underline-offset-4"
              >
                {t("change")}
              </Link>
            ) : null}
          </div>
          <h1 className="text-title">{t("time.title")}</h1>
        </div>
        <TimePicker
          serviceId={service.id}
          barberId={barberId}
          days={dayList}
          date={date}
          slots={starts.ok ? starts.data : []}
          initialStartAt={selection.startAt}
          watchBarberIds={rpcBarberId ? [rpcBarberId] : flow.barbers.map((b) => b.id)}
          notice={notice}
          slotTaken={param(params.aviso) === "ocupada"}
          loadError={!days.ok || !starts.ok}
        />
      </main>
    </>
  );
}
