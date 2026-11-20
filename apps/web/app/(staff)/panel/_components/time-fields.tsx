"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { cn, Field, Input, useFormat } from "@possos/ui";

export interface TimeFieldsProps {
  /** `YYYY-MM-DD` que se muestra. */
  date: string;
  /** `HH:MM` prellenada, o "". */
  time: string;
  /** Horas libres de ese día (ISO), como atajos. */
  freeStarts: string[];
  error?: string;
}

/** `HH:MM` de Bogotá de un instante ISO. */
function hourMinute(iso: string): string {
  const parts = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("hour")}:${get("minute")}`;
}

/**
 * Fecha y hora de una cita del personal. Las horas libres del día son atajos; también se puede
 * escribir cualquier hora que quepa en el horario (el personal no está atado al intervalo).
 * Cambiar la fecha vuelve a pedir las horas libres de ese día (`?fecha=`), sin perder lo demás
 * del formulario.
 */
export function TimeFields({ date, time: initialTime, freeStarts, error }: TimeFieldsProps) {
  const t = useTranslations("web.agenda.timeFields");
  const f = useFormat();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [time, setTime] = useState(initialTime);
  const [day, setDay] = useState(date);
  const [loading, start] = useTransition();

  const changeDay = (next: string) => {
    setDay(next);
    if (!next) return;
    const query = new URLSearchParams(params);
    query.set("fecha", next);
    query.delete("hora");
    start(() => router.replace(`${pathname}?${query}`, { scroll: false }));
  };

  return (
    <fieldset className="grid gap-4">
      <legend className="mb-2 text-heading">{t("legend")}</legend>
      <Field label={t("date")}>
        <Input
          type="date"
          name="fecha"
          value={day}
          required
          onChange={(e) => changeDay(e.target.value)}
        />
      </Field>
      <div className="grid gap-2" aria-busy={loading}>
        <p id="horas-libres" className="text-label">
          {t("freeTimes")}
        </p>
        {loading ? (
          <p className="text-caption text-fg-muted">{t("searching")}</p>
        ) : freeStarts.length === 0 ? (
          <p className="text-caption text-fg-muted">{t("none")}</p>
        ) : (
          <div role="group" aria-labelledby="horas-libres" className="grid grid-cols-3 gap-2">
            {freeStarts.map((s) => {
              const value = hourMinute(s);
              const active = value === time;
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTime(value)}
                  className={cn(
                    "h-12 rounded-card border text-label tabular-nums transition-colors",
                    active
                      ? "border-fg bg-fg text-bg"
                      : "border-border-strong text-fg hover:bg-surface-2",
                  )}
                >
                  {f.time(s)}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <Field label={t("time")} hint={t("timeHint")} error={error}>
        <Input
          type="time"
          name="hora"
          step={300}
          value={time}
          required
          onChange={(e) => setTime(e.target.value)}
        />
      </Field>
    </fieldset>
  );
}
