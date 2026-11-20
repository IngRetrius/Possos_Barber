import Link from "next/link";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { ChevronRight } from "lucide-react";
import { Button, cn, LinkPending, slotClass, useFormat } from "@possos/ui";
import type { QuickSlotDay } from "./quick-slots";

export interface QuickSlotsProps {
  /**
   * Horas agrupadas por día (`groupQuickSlots`). Vacío: no hay horas libres pronto. Null: todavía
   * no llegan o no se pudieron leer; queda solo "Ver todas las horas".
   */
  days: QuickSlotDay[] | null;
  /** Enlace de cada hora: el paso "Confirmar" con servicio, barbero, fecha y hora. */
  hrefFor: (slot: string) => string;
  /** El paso de horario completo, para otro día u otra hora. */
  moreHref: string;
  className?: string;
}

/**
 * "Próximas horas" dentro de un servicio del inicio: hasta seis horas libres como enlaces que
 * llevan directo a "Confirmar", y "Ver todas las horas". Son enlaces armados en el servidor, así
 * que funcionan sin JavaScript. La hora va completa ("3:00 p. m.") porque no hay grupos de
 * mañana, tarde y noche. El nombre accesible empieza por el texto visible y suma el día
 * ("3:00 p. m., hoy, jue 20 nov"), para que la lista de enlaces del lector de pantalla no pierda el día.
 */
export function QuickSlots({ days, hrefFor, moreHref, className }: QuickSlotsProps) {
  const t = useTranslations("booking.quickSlots");
  const f = useFormat();
  const id = useId();
  return (
    <div data-slot="quick-slots" className={cn("grid gap-4", className)}>
      {days === null ? null : days.length > 0 ? (
        <div className="grid gap-3">
          <h3 className="text-label text-fg">{t("title")}</h3>
          {days.map((day) => {
            const labelId = `${id}-${day.date}`;
            // "Mañana · vie 21 nov": la fecha evita confundir el día de mañana con la franja de
            // la mañana del paso de horario.
            const date = f.date(day.slots[0]!);
            const dayLabel = day.relative ? `${t(day.relative)} · ${date}` : date;
            const dayInName = day.relative ? `${t(`${day.relative}InName`)}, ${date}` : date;
            return (
              <div key={day.date} role="group" aria-labelledby={labelId} className="grid gap-2">
                <p id={labelId} className="text-caption text-fg-muted">
                  {dayLabel}
                </p>
                <ul className="grid grid-cols-3 gap-2">
                  {day.slots.map((slot) => (
                    <li key={slot}>
                      <Link
                        href={hrefFor(slot)}
                        aria-label={`${f.time(slot)}, ${dayInName}`}
                        className={slotClass()}
                      >
                        {f.time(slot)}
                        <LinkPending />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-body text-fg-muted">{t("none")}</p>
      )}
      {/* Enlace con flecha y no otra caja: debajo de las horas, una caja más se confundía con
          ellas (docs/11, 20/11/2026). El margen negativo alinea el texto con las horas y deja el
          área táctil a todo lo ancho. */}
      <Button asChild variant="ghost" className="-mx-3 justify-between px-3">
        <Link href={moreHref}>
          {t("more")}
          <ChevronRight aria-hidden="true" strokeWidth={1.5} className="text-fg-muted" />
          <LinkPending />
        </Link>
      </Button>
    </div>
  );
}
