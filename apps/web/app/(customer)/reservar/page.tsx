import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BOOKING_ROUTES, parseSelection, selectionHref, stepPosition } from "@possos/booking";
import { ServiceList } from "@possos/catalog/ui";
import { createClient } from "@possos/supabase/server";
import { Button, EmptyState, StepHeader } from "@possos/ui";
import { loadBookingFlow, timeStepHref } from "../../../lib/booking-flow";
import { LocaleSwitch } from "../../_components/locale-switch";
import { currentLocale } from "../../../lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("web.customer.meta"))("service") };
}

/**
 * Paso "Servicio". Solo se ve con más de un servicio activo: con uno, se elige solo y el flujo
 * sigue al barbero o al horario (docs/11, decisión 3). Tocar una fila avanza.
 */
export default async function ServiceStepPage({ searchParams }: PageProps<"/reservar">) {
  const selection = parseSelection(await searchParams);
  const db = await createClient();
  const flow = await loadBookingFlow(db, { ...selection, serviceId: null });

  if (flow.services.length === 1) redirect(timeStepHref(flow, selection));

  const position = stepPosition("service", flow.steps, await currentLocale());
  const t = await getTranslations("web.customer");
  return (
    <>
      <StepHeader actions={<LocaleSwitch />} {...position} backHref="/" backLabel={t("backHome")} />
      <main className="grid flex-1 content-start gap-6 px-gutter pt-2 pb-8">
        <h1 className="text-title">{t("service.title")}</h1>
        {flow.services.length === 0 ? (
          <EmptyState
            title={t("service.emptyTitle")}
            description={t("service.emptyBody")}
            action={
              <Button asChild variant="secondary">
                <Link href="/">{t("backHome")}</Link>
              </Button>
            }
          />
        ) : (
          <ServiceList
            services={flow.services}
            hrefFor={(service) => selectionHref(BOOKING_ROUTES.barber, { serviceId: service.id })}
          />
        )}
      </main>
    </>
  );
}
