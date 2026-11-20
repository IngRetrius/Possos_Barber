import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { BOOKING_ROUTES, groupQuickSlots, selectionHref } from "@possos/booking";
import { servicePriceLabel, type Service } from "@possos/catalog";
import { parseLocale } from "@possos/config/constants";
import type { DbClient } from "@possos/supabase";
import { Button, formatDuration, formatters, LinkPending, toDateKey } from "@possos/ui";
import { loadQuickSlots, type ServiceEntry } from "../../lib/booking-flow";

/** Id del bloque: la barra "Reservar" se esconde mientras se ve (no deben verse dos amarillos). */
export const NEXT_SLOT_ID = "proxima-hora";

interface NextSlotProps {
  db: DbClient;
  /** El servicio destacado: el primero de la lista con un solo barbero. */
  service: Service;
  entry: ServiceEntry & { barberId: string };
  /** Id de la lista de servicios, para "Otra hora o servicio". */
  listId: string;
}

/**
 * "Próxima hora libre" arriba del inicio (docs/11, "Inicio público", 20/11/2026): la hora más
 * cercana del primer servicio de la lista, con el botón amarillo que lleva a "Confirmar". Reservar
 * el servicio principal queda en dos toques y el acento aparece donde primero se mira.
 *
 * El servicio va sin adicionales; quien quiera barba o cejas baja a la lista con "Otra hora o
 * servicio". La hora llega en streaming: mientras tanto (y sin JavaScript, que no recibe el
 * reemplazo) el botón dice "Reservar" y lleva al horario de ese servicio, que siempre funciona.
 */
export function NextSlot({ db, service, entry, listId }: NextSlotProps) {
  return (
    <section
      id={NEXT_SLOT_ID}
      aria-labelledby={`${NEXT_SLOT_ID}-titulo`}
      className="grid gap-4 rounded-card border border-border bg-surface p-5"
    >
      <Suspense fallback={<NextSlotView service={service} entry={entry} listId={listId} />}>
        <LoadedNextSlot db={db} service={service} entry={entry} listId={listId} />
      </Suspense>
    </section>
  );
}

async function LoadedNextSlot({
  db,
  service,
  entry,
  listId,
}: Omit<NextSlotProps, "db"> & {
  db: DbClient;
}) {
  const slots = await loadQuickSlots(db, {
    serviceId: service.id,
    barberId: entry.barberId,
    addonIds: [],
  });
  // null: no se pudieron leer; se queda como mientras carga, con "Reservar" al horario.
  return (
    <NextSlotView
      service={service}
      entry={entry}
      listId={listId}
      slot={slots === null ? undefined : (slots[0] ?? null)}
    />
  );
}

/**
 * `slot`: la hora (ISO), null si no hay horas pronto, o undefined mientras llega. Las tres formas
 * ocupan casi lo mismo para que el inicio no salte al llegar la hora.
 */
async function NextSlotView({
  service,
  entry,
  listId,
  slot,
}: Omit<NextSlotProps, "db"> & { slot?: string | null }) {
  const t = await getTranslations("web.home.next");
  const tDays = await getTranslations("booking.quickSlots");
  const tCommon = await getTranslations("web.common");
  const f = formatters(parseLocale(await getLocale()));
  const day = slot ? groupQuickSlots([slot], toDateKey(new Date()))[0] : undefined;
  const dayLabel =
    slot && day ? (day.relative ? `${tDays(day.relative)} · ${f.date(slot)}` : f.date(slot)) : null;
  const detail = [
    service.name,
    formatDuration(service.duration_min),
    servicePriceLabel(service.price_cop, f.locale),
  ].join(" · ");

  return (
    <>
      <div className="grid gap-1">
        <h2 id={`${NEXT_SLOT_ID}-titulo`} className="text-caption text-fg-muted">
          {t("title")}
        </h2>
        {slot ? (
          <p className="grid gap-0.5">
            <span className="text-title text-fg tabular-nums">{f.time(slot)}</span>
            <span className="text-label text-fg">{dayLabel}</span>
          </p>
        ) : slot === null ? (
          <p className="text-heading text-fg">{t("none")}</p>
        ) : (
          // Mientras llega la hora: un renglón que pulsa, del alto del título. Sin JavaScript no
          // llega nunca, así que no se muestra.
          <span
            aria-hidden="true"
            className="my-1 h-7 w-40 animate-pulse rounded-sm bg-surface-2 [@media(scripting:none)]:hidden"
          />
        )}
        <p className="text-body text-fg-muted">{detail}</p>
      </div>
      <div className="grid gap-1">
        <Button asChild variant={slot === null ? "secondary" : "primary"} className="w-full">
          <Link
            href={
              slot
                ? selectionHref(BOOKING_ROUTES.confirm, {
                    serviceId: service.id,
                    addonIds: [],
                    barberId: entry.barberId,
                    date: toDateKey(slot),
                    startAt: slot,
                  })
                : entry.href
            }
            aria-label={slot ? `${t("book")}: ${f.time(slot)}, ${dayLabel}` : undefined}
          >
            {slot ? t("book") : slot === null ? t("seeTimes") : tCommon("book")}
            <LinkPending />
          </Link>
        </Button>
        <Button asChild variant="ghost" className="w-full text-fg-muted">
          <a href={`#${listId}`}>
            {t("others")}
            <ChevronDown aria-hidden="true" strokeWidth={1.5} />
          </a>
        </Button>
      </div>
    </>
  );
}
