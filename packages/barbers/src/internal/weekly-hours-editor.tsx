"use client";

import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { parseLocale } from "@possos/config/constants";
import { BottomBar, Button, cn } from "@possos/ui";
import { WEEKDAY_NAMES_BY_LOCALE } from "./hours";
import { validateWeeklyRanges, type WeeklyRange } from "./weekly-hours";

export interface WeeklyHoursState {
  error?: string;
  saved?: boolean;
}

export type WeeklyHoursAction = (
  state: WeeklyHoursState,
  form: FormData,
) => Promise<WeeklyHoursState>;

export interface WeeklyHoursEditorProps {
  action: WeeklyHoursAction;
  barberId: string;
  initial: WeeklyRange[];
}

interface Row extends WeeklyRange {
  key: number;
}

let nextKey = 0;
const withKey = (r: WeeklyRange): Row => ({ ...r, key: nextKey++ });

function addHours(time: string, hours: number): string {
  const [h = 0, m = 0] = time.split(":").map(Number);
  const total = Math.min(h * 60 + m + hours * 60, 23 * 60 + 55);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

const timeInput =
  "h-12 w-0 min-w-0 flex-1 rounded-card border border-border-strong bg-surface px-2 text-body text-fg tabular-nums aria-invalid:border-danger";

/**
 * Horario semanal (docs/11, "Más"): varios rangos por día (el almuerzo es el hueco entre dos).
 * Se guarda la semana entera de una vez (`set_working_hours`). Los errores salen junto al día
 * antes de enviar; la base los revisa otra vez.
 */
export function WeeklyHoursEditor({ action, barberId, initial }: WeeklyHoursEditorProps) {
  const t = useTranslations("barbers.weekly");
  const names = WEEKDAY_NAMES_BY_LOCALE[parseLocale(useLocale())];
  const [rows, setRows] = useState<Row[]>(() => initial.map(withKey));
  const [state, formAction, pending] = useActionState(action, {});
  const [touched, setTouched] = useState(false);
  const errors = validateWeeklyRanges(rows);

  const update = (key: number, patch: Partial<WeeklyRange>) => {
    setTouched(true);
    setRows((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };
  const add = (weekday: number) => {
    setTouched(true);
    setRows((list) => {
      const today = list.filter((r) => r.weekday === weekday);
      const last = today.at(-1);
      const start = last ? last.end_time : "09:00";
      return [...list, withKey({ weekday, start_time: start, end_time: addHours(start, 3) })];
    });
  };
  const copyPrevious = (weekday: number) => {
    setTouched(true);
    setRows((list) => [
      ...list.filter((r) => r.weekday !== weekday),
      ...list.filter((r) => r.weekday === weekday - 1).map((r) => withKey({ ...r, weekday })),
    ]);
  };

  const summary = state.error ? (
    <span className="text-danger">{state.error}</span>
  ) : errors.size ? (
    <span className="text-danger">{t("reviewDays")}</span>
  ) : state.saved && !touched ? (
    t("saved")
  ) : null;

  return (
    <form
      action={(form) => {
        setTouched(false);
        return formAction(form);
      }}
      className="flex flex-1 flex-col"
    >
      <input type="hidden" name="barbero" value={barberId} />
      {rows.map((r) => (
        <input
          key={r.key}
          type="hidden"
          name="rango"
          value={`${r.weekday}|${r.start_time}|${r.end_time}`}
        />
      ))}
      <div className="grid gap-3 px-gutter pt-2 pb-8">
        {names.map((name, index) => {
          const weekday = index + 1;
          const today = rows
            .filter((r) => r.weekday === weekday)
            .sort((a, b) => a.start_time.localeCompare(b.start_time));
          const error = errors.get(weekday);
          const title = name.charAt(0).toUpperCase() + name.slice(1);
          return (
            <fieldset
              key={weekday}
              className={cn(
                "grid gap-3 rounded-card border bg-surface p-4",
                error ? "border-danger" : "border-border",
              )}
              aria-describedby={error ? `dia-${weekday}-error` : undefined}
            >
              <legend className="sr-only">{title}</legend>
              <div className="flex items-center justify-between gap-2">
                <p aria-hidden="true" className="text-label">
                  {title}
                </p>
                {today.length === 0 ? (
                  <span className="text-caption text-fg-muted">{t("closed")}</span>
                ) : null}
              </div>
              {today.map((r, i) => (
                <div key={r.key} className="flex items-center gap-2">
                  <input
                    type="time"
                    step={300}
                    value={r.start_time}
                    aria-label={t("rangeFrom", { day: title, n: i + 1 })}
                    aria-invalid={Boolean(error) || undefined}
                    onChange={(e) => update(r.key, { start_time: e.target.value })}
                    className={timeInput}
                  />
                  <span className="text-caption text-fg-muted">{t("to")}</span>
                  <input
                    type="time"
                    step={300}
                    value={r.end_time}
                    aria-label={t("rangeTo", { day: title, n: i + 1 })}
                    aria-invalid={Boolean(error) || undefined}
                    onChange={(e) => update(r.key, { end_time: e.target.value })}
                    className={timeInput}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t("remove", { n: i + 1, day: name })}
                    onClick={() => {
                      setTouched(true);
                      setRows((list) => list.filter((x) => x.key !== r.key));
                    }}
                  >
                    <X strokeWidth={1.5} aria-hidden="true" />
                  </Button>
                </div>
              ))}
              {error ? (
                <p id={`dia-${weekday}-error`} className="text-caption text-danger">
                  {t(`errors.${error}`)}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="px-4"
                  onClick={() => add(weekday)}
                >
                  {t("add")}
                  <span className="sr-only">{t("addTo", { day: name })}</span>
                </Button>
                {weekday > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-3"
                    onClick={() => copyPrevious(weekday)}
                  >
                    {t("sameAs", { day: names[index - 1]! })}
                  </Button>
                ) : null}
              </div>
            </fieldset>
          );
        })}
      </div>
      <BottomBar summary={summary}>
        <Button type="submit" disabled={pending || errors.size > 0} aria-busy={pending}>
          {pending ? t("saving") : t("save")}
        </Button>
      </BottomBar>
    </form>
  );
}
