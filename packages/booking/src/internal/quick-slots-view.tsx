import Link from "next/link";
import { useId } from "react";
import { Button, cn, formatDate, formatTime, LinkPending } from "@possos/ui";
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

const RELATIVE = { today: "Hoy", tomorrow: "Mañana" } as const;
const RELATIVE_IN_NAME = { today: "hoy", tomorrow: "mañana" } as const;

/**
 * "Próximas horas" dentro de un servicio del inicio: hasta seis horas libres como enlaces que
 * llevan directo a "Confirmar", y "Ver todas las horas". Son enlaces armados en el servidor, así
 * que funcionan sin JavaScript. La hora va completa ("3:00 p. m.") porque no hay grupos de
 * mañana, tarde y noche. El nombre accesible empieza por el texto visible y suma el día
 * ("3:00 p. m., hoy, jue 20 nov"), para que la lista de enlaces del lector de pantalla no pierda el día.
 */
export function QuickSlots({ days, hrefFor, moreHref, className }: QuickSlotsProps) {
  const id = useId();
  return (
    <div data-slot="quick-slots" className={cn("grid gap-4", className)}>
      {days === null ? null : days.length > 0 ? (
        <div className="grid gap-3">
          <h3 className="text-label text-fg">Próximas horas</h3>
          {days.map((day) => {
            const labelId = `${id}-${day.date}`;
            // "Mañana · vie 21 nov": la fecha evita confundir el día de mañana con la franja de
            // la mañana del paso de horario.
            const date = formatDate(day.slots[0]!);
            const dayLabel = day.relative ? `${RELATIVE[day.relative]} · ${date}` : date;
            const dayInName = day.relative ? `${RELATIVE_IN_NAME[day.relative]}, ${date}` : date;
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
                        aria-label={`${formatTime(slot)}, ${dayInName}`}
                        className={cn(
                          "relative flex h-12 items-center justify-center rounded-card border border-border-strong px-1",
                          "text-label whitespace-nowrap text-fg tabular-nums transition-colors",
                          "hover:bg-surface-2 active:bg-surface-2",
                        )}
                      >
                        {formatTime(slot)}
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
        <p className="text-body text-fg-muted">No hay horas libres en los próximos días.</p>
      )}
      <Button asChild variant="secondary" className="w-full">
        <Link href={moreHref}>
          Ver todas las horas
          <LinkPending />
        </Link>
      </Button>
    </div>
  );
}
