"use client";

import { useEffect, useId, useRef } from "react";
import { cn } from "../cn";
import { bogotaParts, formatDateLong, formatMonthYear, formatWeekdayShort } from "../format";

export interface DateStripDay {
  /** Día del calendario en Bogotá, `YYYY-MM-DD` (ver `toDateKey`). */
  date: string;
  /** Horas libres ese día. Con 0, el día se ve apagado y dice "Sin horas", pero se puede elegir. */
  slots: number;
  /** No se puede elegir (por ejemplo, fuera de la ventana de reserva). */
  disabled?: boolean;
}

export interface DateStripProps {
  days: DateStripDay[];
  value: string | null;
  onChange: (date: string) => void;
  /** Nombre del grupo para el lector de pantalla. */
  label?: string;
  className?: string;
}

function dayName(day: DateStripDay) {
  const slots =
    day.slots === 0 ? "sin horas" : day.slots === 1 ? "1 hora libre" : `${day.slots} horas libres`;
  return `${formatDateLong(day.date)}, ${slots}`;
}

/**
 * Tira horizontal de días. Es un grupo de radios nativos: Tab entra al día elegido y las flechas
 * cambian de día. Cada día se anuncia completo: "jueves 20 de noviembre, 6 horas libres".
 */
export function DateStrip({ days, value, onChange, label = "Día", className }: DateStripProps) {
  const name = useId();
  const scroller = useRef<HTMLDivElement>(null);

  // Lleva el día elegido a la vista sin mover la página en vertical.
  useEffect(() => {
    const el = scroller.current?.querySelector<HTMLElement>("[data-checked=true]");
    const box = scroller.current;
    if (!el || !box) return;
    const left = el.offsetLeft - box.offsetLeft;
    if (left < box.scrollLeft || left + el.offsetWidth > box.scrollLeft + box.clientWidth) {
      box.scrollTo({ left: left - box.clientWidth / 2 + el.offsetWidth / 2 });
    }
  }, [value]);

  const month = value ?? days[0]?.date;

  return (
    <div data-slot="date-strip" className={cn("grid gap-2", className)}>
      {month ? (
        <p className="px-gutter text-label text-fg-muted" aria-hidden="true">
          {formatMonthYear(month)}
        </p>
      ) : null}
      <div
        ref={scroller}
        role="radiogroup"
        aria-label={label}
        className="flex snap-x gap-2 overflow-x-auto scroll-px-gutter px-gutter py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {days.map((day) => {
          const checked = day.date === value;
          const empty = day.slots === 0;
          return (
            <label
              key={day.date}
              data-checked={checked}
              className={cn(
                "relative flex w-17 shrink-0 snap-start flex-col items-center rounded-pill border py-2 transition-colors",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                checked
                  ? "border-accent bg-accent text-accent-fg"
                  : empty
                    ? "border-border text-fg-subtle"
                    : "border-border-strong text-fg",
                day.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                !checked && !day.disabled && "hover:bg-surface-2",
              )}
            >
              <input
                type="radio"
                name={name}
                value={day.date}
                checked={checked}
                disabled={day.disabled}
                aria-label={dayName(day)}
                onChange={() => onChange(day.date)}
                className="peer sr-only"
              />
              <span aria-hidden="true" className="text-caption">
                {formatWeekdayShort(day.date)}
              </span>
              <span aria-hidden="true" className="text-heading tabular-nums">
                {bogotaParts(day.date).day}
              </span>
              <span
                aria-hidden="true"
                className={cn("text-caption whitespace-nowrap", !empty && "invisible")}
              >
                Sin horas
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
