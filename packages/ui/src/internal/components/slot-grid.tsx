"use client";

import { useId } from "react";
import { cn } from "../cn";
import {
  DAY_PERIOD_LABEL,
  dayPeriod,
  formatTime,
  formatTimeShort,
  type DayPeriod,
} from "../format";
import { Skeleton } from "./feedback";

export interface SlotGridProps {
  /** Inicios de las horas libres (ISO en UTC). Las ocupadas no se pasan. */
  slots: string[];
  value: string | null;
  onChange: (slot: string) => void;
  /** Nombre del grupo para el lector de pantalla. */
  label?: string;
  className?: string;
}

const PERIODS: DayPeriod[] = ["morning", "afternoon", "evening"];

/**
 * Cuadrícula de 3 columnas agrupada en "Mañana", "Tarde" y "Noche", con elección única.
 * Radios nativos: las flechas recorren todas las horas. En la cuadrícula la hora va corta
 * ("3:00"); el lector de pantalla la oye completa ("3:00 p. m.").
 */
export function SlotGrid({
  slots,
  value,
  onChange,
  label = "Horas libres",
  className,
}: SlotGridProps) {
  const id = useId();
  if (slots.length === 0) return null;

  const groups = PERIODS.map((period) => ({
    period,
    slots: slots.filter((s) => dayPeriod(s) === period),
  })).filter((g) => g.slots.length > 0);

  return (
    <div
      role="radiogroup"
      aria-label={label}
      data-slot="slot-grid"
      className={cn("grid gap-6", className)}
    >
      {groups.map((group) => {
        const headingId = `${id}-${group.period}`;
        return (
          <div key={group.period} role="group" aria-labelledby={headingId} className="grid gap-3">
            <h3 id={headingId} className="text-heading">
              {DAY_PERIOD_LABEL[group.period]}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {group.slots.map((slot) => {
                const checked = slot === value;
                return (
                  <label
                    key={slot}
                    className={cn(
                      "relative flex h-12 cursor-pointer items-center justify-center rounded-card border text-label tabular-nums transition-colors",
                      "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                      checked
                        ? "border-accent bg-accent text-accent-fg"
                        : "border-border-strong text-fg hover:bg-surface-2",
                    )}
                  >
                    <input
                      type="radio"
                      name={id}
                      value={slot}
                      checked={checked}
                      aria-label={formatTime(slot)}
                      onChange={() => onChange(slot)}
                      className="sr-only"
                    />
                    <span aria-hidden="true">{formatTimeShort(slot)}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Esqueleto de la cuadrícula mientras cargan las horas de otro día. */
export function SlotGridSkeleton({ rows = 2, className }: { rows?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("grid gap-3", className)}>
      <Skeleton className="h-7 w-24" />
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: rows * 3 }, (_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    </div>
  );
}
