import Link from "next/link";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { ADDON_PARAM, BOOKING_ROUTES, groupQuickSlots, selectionHref } from "@possos/booking";
import { QuickSlots } from "@possos/booking/ui";
import { pickAddons, type Service } from "@possos/catalog";
import { AddonPicker } from "@possos/catalog/ui";
import type { DbClient } from "@possos/supabase";
import { Button, LinkPending, toDateKey } from "@possos/ui";
import { loadQuickSlots, type ServiceEntry } from "../../lib/booking-flow";

interface ServiceBookingProps {
  db: DbClient;
  service: Service;
  entry: ServiceEntry;
  /** Adicionales de la URL (`?servicio=…&adicional=…`) si este es el servicio abierto. */
  selectedAddonIds: string[];
}

/**
 * Lo que va al abrir un servicio del inicio.
 *
 * - Si tiene adicionales (barba, cejas, diseño), "Agrega" con el total. Marcar uno vuelve a pedir
 *   el inicio con `?servicio=…&adicional=…`, porque las horas libres dependen de la duración
 *   (la barba suma 1 h).
 * - Con un solo barbero, las próximas horas libres (llevan directo a "Confirmar") y "Ver todas las
 *   horas". Las horas llegan en streaming: el inicio no las espera, y mientras tanto (o sin
 *   JavaScript, que no recibe el reemplazo) queda "Ver todas las horas", que siempre funciona.
 * - Con varios barberos, "Reservar este servicio" lleva a elegirlo.
 */
export function ServiceBooking({ db, service, entry, selectedAddonIds }: ServiceBookingProps) {
  const t = useTranslations("web.common");
  const { barberId } = entry;
  const addonIds = pickAddons(entry.addons, selectedAddonIds).map((a) => a.id);
  const moreHref = entry.hrefWith(addonIds);

  const picker = entry.addons.length ? (
    <AddonPicker
      action="/"
      hidden={{ servicio: service.id }}
      name={ADDON_PARAM}
      service={service}
      addons={entry.addons}
      selected={addonIds}
      mode="refresh"
    />
  ) : null;

  if (!barberId) {
    return (
      <>
        {picker}
        <Button asChild variant="secondary" className="w-full">
          <Link href={moreHref}>
            {t("bookService")}
            <LinkPending />
          </Link>
        </Button>
      </>
    );
  }
  const hrefFor = confirmHref(service.id, addonIds, barberId);
  return (
    <>
      {picker}
      <Suspense
        key={addonIds.join(",")}
        fallback={<QuickSlots days={null} hrefFor={hrefFor} moreHref={moreHref} />}
      >
        <LoadedQuickSlots
          db={db}
          serviceId={service.id}
          addonIds={addonIds}
          barberId={barberId}
          moreHref={moreHref}
        />
      </Suspense>
    </>
  );
}

/** "Confirmar" con la hora elegida, como si el cliente viniera del paso de horario. */
function confirmHref(serviceId: string, addonIds: string[], barberId: string) {
  return (slot: string) =>
    selectionHref(BOOKING_ROUTES.confirm, {
      serviceId,
      addonIds,
      barberId,
      date: toDateKey(slot),
      startAt: slot,
    });
}

async function LoadedQuickSlots({
  db,
  serviceId,
  addonIds,
  barberId,
  moreHref,
}: {
  db: DbClient;
  serviceId: string;
  addonIds: string[];
  barberId: string;
  moreHref: string;
}) {
  const slots = await loadQuickSlots(db, { serviceId, barberId, addonIds });
  return (
    <QuickSlots
      days={slots ? groupQuickSlots(slots, toDateKey(new Date())) : null}
      hrefFor={confirmHref(serviceId, addonIds, barberId)}
      moreHref={moreHref}
    />
  );
}
