import Link from "next/link";
import { Suspense } from "react";
import { BOOKING_ROUTES, groupQuickSlots, selectionHref } from "@possos/booking";
import { QuickSlots } from "@possos/booking/ui";
import type { DbClient } from "@possos/supabase";
import { Button, LinkPending, toDateKey } from "@possos/ui";
import { loadQuickSlots, type ServiceEntry } from "../../lib/booking-flow";

interface ServiceBookingProps {
  db: DbClient;
  serviceId: string;
  entry: ServiceEntry;
}

/**
 * Lo que va al abrir un servicio del inicio. Con un solo barbero, las próximas horas libres
 * (llevan directo a "Confirmar") y "Ver todas las horas". Las horas llegan en streaming: el inicio
 * no las espera, y mientras tanto (o sin JavaScript, que no recibe el reemplazo) queda "Ver todas
 * las horas", que siempre funciona. Con varios barberos, "Reservar este servicio" lleva a elegirlo.
 */
export function ServiceBooking({ db, serviceId, entry }: ServiceBookingProps) {
  const { barberId } = entry;
  if (!barberId) {
    return (
      <Button asChild variant="secondary" className="w-full">
        <Link href={entry.href}>
          Reservar este servicio
          <LinkPending />
        </Link>
      </Button>
    );
  }
  return (
    <Suspense
      fallback={
        <QuickSlots days={null} hrefFor={confirmHref(serviceId, barberId)} moreHref={entry.href} />
      }
    >
      <LoadedQuickSlots db={db} serviceId={serviceId} barberId={barberId} moreHref={entry.href} />
    </Suspense>
  );
}

/** "Confirmar" con la hora elegida, como si el cliente viniera del paso de horario. */
function confirmHref(serviceId: string, barberId: string) {
  return (slot: string) =>
    selectionHref(BOOKING_ROUTES.confirm, {
      serviceId,
      barberId,
      date: toDateKey(slot),
      startAt: slot,
    });
}

async function LoadedQuickSlots({
  db,
  serviceId,
  barberId,
  moreHref,
}: {
  db: DbClient;
  serviceId: string;
  barberId: string;
  moreHref: string;
}) {
  const slots = await loadQuickSlots(db, { serviceId, barberId });
  return (
    <QuickSlots
      days={slots ? groupQuickSlots(slots, toDateKey(new Date())) : null}
      hrefFor={confirmHref(serviceId, barberId)}
      moreHref={moreHref}
    />
  );
}
