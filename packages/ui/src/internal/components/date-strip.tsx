"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef } from "react";
import { parseLocale } from "@possos/config/constants";
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

/** Días de una semana de lunes a domingo (2026-01-05 fue lunes), para el encabezado del mes. */
const WEEK = ["05", "06", "07", "08", "09", "10", "11"].map((d) => `2026-01-${d}`);

/**
 * Tira horizontal de días. Es un grupo de radios nativos: Tab entra al día elegido y las flechas
 * cambian de día. Cada día se anuncia completo: "jueves 20 de noviembre, 6 horas libres".
 *
 * Desde `md:` los mismos radios se acomodan como un mes de 7 columnas, de lunes a domingo
 * (docs/11: en escritorio, la tira se vuelve un mes). Solo cambia el CSS; el flujo es el mismo.
 */
export function DateStrip({ days, value, onChange, label, className }: DateStripProps) {
  const t = useTranslations("ui.dateStrip");
  const locale = parseLocale(useLocale());
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
  // Celdas vacías antes del primer día para que caiga en su columna (0 = lunes).
  const offset = days[0] ? (bogotaParts(days[0].date).weekday + 6) % 7 : 0;

  return (
    <div data-slot="date-strip" className={cn("grid gap-2", className)}>
      {month ? (
        <p className="px-gutter text-label text-fg-muted" aria-hidden="true">
          {formatMonthYear(month, locale)}
        </p>
      ) : null}
      <div
        aria-hidden="true"
        className="hidden grid-cols-7 gap-2 px-gutter text-center text-caption text-fg-muted md:grid"
      >
        {WEEK.map((date) => (
          <span key={date}>{formatWeekdayShort(date, locale)}</span>
        ))}
      </div>
      <div
        ref={scroller}
        role="radiogroup"
        aria-label={label ?? t("label")}
        className="flex snap-x gap-2 overflow-x-auto scroll-px-gutter px-gutter py-1 [scrollbar-width:none] md:grid md:snap-none md:grid-cols-7 md:overflow-visible [&::-webkit-scrollbar]:hidden"
      >
        {Array.from({ length: offset }, (_, i) => (
          <span key={`vacio-${i}`} aria-hidden="true" className="hidden md:block" />
        ))}
        {days.map((day) => {
          const checked = day.date === value;
          const empty = day.slots === 0;
          return (
            <label
              key={day.date}
              data-checked={checked}
              className={cn(
                "relative flex w-17 shrink-0 snap-start flex-col items-center rounded-pill border py-2 transition-colors md:w-auto md:rounded-card",
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
                aria-label={t("dayName", {
                  date: formatDateLong(day.date, locale),
                  slots: day.slots,
                })}
                onChange={() => onChange(day.date)}
                className="peer sr-only"
              />
              <span aria-hidden="true" className="text-caption md:hidden">
                {formatWeekdayShort(day.date, locale)}
              </span>
              <span aria-hidden="true" className="text-heading tabular-nums">
                {bogotaParts(day.date).day}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "text-caption whitespace-nowrap md:whitespace-normal md:text-center",
                  !empty && "invisible",
                )}
              >
                {t("noSlots")}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
