import { Plus, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn, StatusBadge, useFormat } from "@possos/ui";
import type { AgendaItem } from "./agenda";
import { APPOINTMENT_STATUS_DISPLAY, TO_CLOSE_DISPLAY } from "./status";

export interface AgendaListProps {
  items: AgendaItem[];
  /** Instante actual (ISO) si el día mostrado es hoy: dibuja la línea de "ahora". */
  now?: string | null;
  onSelect: (appointmentId: string) => void;
  /** A dónde lleva una hora libre ("Nueva cita" con esa hora). */
  freeHref: (start: string) => string;
  /**
   * Avisos por cita (id → texto), por ejemplo "El recordatorio falló" (F7). Los arma la app:
   * booking no conoce los mensajes de notifications.
   */
  warnings?: Record<string, string>;
  className?: string;
}

const row = "flex min-h-16 w-full items-center gap-3 px-gutter py-3 text-left transition-colors";
const time = "w-[5.75rem] shrink-0 text-label tabular-nums";

/**
 * Agenda del día como lista por hora (docs/11, "Hoy"): citas, horas libres y bloqueos, con la
 * línea amarilla de "ahora". Tocar una cita la abre; tocar una hora libre crea una cita.
 */
export function AgendaList({
  items,
  now,
  onSelect,
  freeHref,
  warnings,
  className,
}: AgendaListProps) {
  const t = useTranslations("booking.agenda");
  const f = useFormat();
  const nowMs = now ? new Date(now).getTime() : null;
  const nowIndex =
    nowMs === null ? -1 : items.findIndex((item) => new Date(item.start).getTime() > nowMs);
  const nowLine = (
    <li key="ahora" className="flex items-center gap-2 px-gutter py-1">
      <span className="text-caption font-medium text-accent">{t("now")}</span>
      <span aria-hidden="true" className="h-0.5 flex-1 rounded-pill bg-accent" />
    </li>
  );

  return (
    <ol aria-label={t("label")} className={cn("divide-y divide-border", className)}>
      {items.map((item, index) => {
        const before = index === nowIndex ? nowLine : null;
        const key = `${item.kind}-${item.start}`;
        if (item.kind === "appointment") {
          const a = item.appointment;
          const toClose =
            nowMs !== null &&
            (a.status === "booked" || a.status === "confirmed") &&
            new Date(a.start).getTime() <= nowMs;
          const display = toClose
            ? TO_CLOSE_DISPLAY[f.locale]
            : APPOINTMENT_STATUS_DISPLAY[f.locale][a.status];
          return [
            before,
            <li key={key}>
              <button
                type="button"
                onClick={() => onSelect(a.id)}
                className={cn(row, "hover:bg-surface active:bg-surface")}
              >
                <span className={time}>{f.time(a.start)}</span>
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="truncate text-label">{a.customerName}</span>
                  <span className="truncate text-caption text-fg-muted">
                    {t("until", { service: a.serviceName, time: f.time(a.end) })}
                  </span>
                  {warnings?.[a.id] ? (
                    <span className="flex items-center gap-1 text-caption text-danger">
                      <TriangleAlert
                        aria-hidden="true"
                        strokeWidth={1.5}
                        className="size-3.5 shrink-0"
                      />
                      <span className="truncate">{warnings[a.id]}</span>
                    </span>
                  ) : null}
                </span>
                <StatusBadge tone={display.tone} className="shrink-0">
                  {display.label}
                </StatusBadge>
              </button>
            </li>,
          ];
        }
        if (item.kind === "free") {
          return [
            before,
            <li key={key}>
              <Link
                href={freeHref(item.start)}
                className={cn(row, "text-fg-muted hover:bg-surface active:bg-surface")}
              >
                <span className={time}>{f.time(item.start)}</span>
                <span className="flex-1 text-body">
                  {t("free")}
                  <span className="sr-only">{t("freeHint")}</span>
                </span>
                <Plus aria-hidden="true" strokeWidth={1.5} className="size-5 shrink-0" />
              </Link>
            </li>,
          ];
        }
        return [
          before,
          <li key={key} className={cn(row, "text-fg-subtle")}>
            <span className={time}>{item.allDay ? t("allDay") : f.time(item.start)}</span>
            <span className="grid min-w-0 flex-1 gap-0.5">
              <span className="text-body">{t("blocked")}</span>
              <span className="truncate text-caption">
                {item.allDay ? "" : f.timeRange(item.start, item.end)}
                {item.block.reason ? `${item.allDay ? "" : " · "}${item.block.reason}` : ""}
              </span>
            </span>
          </li>,
        ];
      })}
      {nowIndex === -1 && nowMs !== null && items.length > 0 ? nowLine : null}
    </ol>
  );
}
