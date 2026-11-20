import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  ANY_BARBER,
  BOOKING_ROUTES,
  parseSelection,
  selectionHref,
  stepPosition,
} from "@possos/booking";
import { BarberList } from "@possos/barbers/ui";
import { createClient } from "@possos/supabase/server";
import { formatDuration, StepHeader } from "@possos/ui";
import { loadBookingFlow, previousStepHref } from "../../../../lib/booking-flow";
import { LocaleSwitch } from "../../../_components/locale-switch";
import { currentLocale } from "../../../../lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("web.customer.meta"))("barber") };
}

/**
 * Paso "Barbero": los barberos que hacen el servicio y "Cualquiera disponible". Con un solo
 * barbero el paso se salta.
 */
export default async function BarberStepPage({ searchParams }: PageProps<"/reservar/barbero">) {
  const selection = parseSelection(await searchParams);
  const db = await createClient();
  const flow = await loadBookingFlow(db, { ...selection, barberId: null });
  if (!flow.service) redirect(BOOKING_ROUTES.service);

  const service = flow.service;
  const addonIds = flow.selectedAddons.map((a) => a.id);
  if (flow.barbers.length <= 1) {
    redirect(
      selectionHref(BOOKING_ROUTES.time, {
        serviceId: service.id,
        addonIds,
        barberId: flow.barberId,
      }),
    );
  }

  const position = stepPosition("barber", flow.steps, await currentLocale());
  const t = await getTranslations("web.customer.barber");
  const timeHref = (barberId: string) =>
    selectionHref(BOOKING_ROUTES.time, {
      serviceId: service.id,
      addonIds,
      barberId,
      date: selection.date,
    });
  return (
    <>
      <StepHeader
        actions={<LocaleSwitch />}
        {...position}
        backHref={previousStepHref(flow, "barber", selection)}
      />
      <main className="grid flex-1 content-start gap-6 px-gutter pt-2 pb-8">
        <div className="grid gap-2">
          <p className="text-body text-fg-muted">
            {flow.label} · {formatDuration(flow.total!.durationMin)}
          </p>
          <h1 className="text-title">{t("title")}</h1>
        </div>
        <BarberList
          barbers={flow.barbers}
          hrefFor={(barber) => timeHref(barber.id)}
          anyHref={timeHref(ANY_BARBER)}
        />
      </main>
    </>
  );
}
