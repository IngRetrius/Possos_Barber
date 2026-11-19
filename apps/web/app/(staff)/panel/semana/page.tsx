import type { Metadata } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { addDays, dayOccupancy, weekStart } from "@possos/booking";
import { Button, formatDate } from "@possos/ui";
import { loadPanel } from "../../../../lib/panel";
import { parseDay, todayKey } from "../../../../lib/panel-dates";
import { param } from "../../../../lib/session";
import { BarberSwitcher } from "../_components/barber-switcher";
import { loadAgendaDays } from "../_lib/free-starts";

export const metadata: Metadata = { title: "Semana · Panel · Possos Barber" };

/**
 * "Semana" (docs/11): 7 días con una barra de ocupación y el número de citas. Tocar un día lo
 * abre en "Hoy". `?desde=YYYY-MM-DD` muestra otra semana (de lunes a domingo).
 */
export default async function WeekPage({ searchParams }: PageProps<"/panel/semana">) {
  const params = await searchParams;
  const ctx = await loadPanel("/panel/semana");
  const today = todayKey();
  const monday = weekStart(parseDay(param(params.desde)) ?? today);
  const barber = ctx.barber;
  const days = barber ? await loadAgendaDays(ctx.db, barber, monday, 7) : [];
  const weekHref = (d: string) => `/panel/semana?desde=${d}`;

  return (
    <main className="grid content-start gap-5 pb-6">
      <header className="grid gap-1 px-gutter pt-safe">
        <h1 className="pt-4 text-title">Semana</h1>
        <div className="flex items-center justify-between gap-2">
          <p className="text-body text-fg-muted tabular-nums">
            {formatDate(monday)} a {formatDate(addDays(monday, 6))}
          </p>
          <nav aria-label="Cambiar de semana" className="flex shrink-0 items-center">
            <Button asChild variant="ghost" size="icon">
              <Link href={weekHref(addDays(monday, -7))} aria-label="Semana anterior">
                <ChevronLeft strokeWidth={1.5} aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon">
              <Link href={weekHref(addDays(monday, 7))} aria-label="Semana siguiente">
                <ChevronRight strokeWidth={1.5} aria-hidden="true" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>
      {barber && ctx.viewer.isAdmin && (ctx.barbers.length > 1 || !ctx.viewer.barberId) ? (
        <BarberSwitcher
          value={barber.id}
          barbers={ctx.barbers.map((b) => ({ id: b.id, name: b.display_name, active: b.active }))}
        />
      ) : null}
      {!barber ? (
        <p className="px-gutter text-body text-fg-muted">Todavía no hay barberos.</p>
      ) : days.some((d) => !d.ok) ? (
        <p role="alert" className="px-gutter text-body text-danger">
          No pudimos cargar la semana. Revisa tu conexión e intenta de nuevo
        </p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {days.map(({ day, items }) => {
            const occupancy = dayOccupancy(items);
            const closed = occupancy.appointments + occupancy.free === 0;
            const blockedAllDay = items.some((i) => i.kind === "blocked" && i.allDay);
            const detail = blockedAllDay
              ? "Bloqueado"
              : closed
                ? "Sin horario"
                : `${occupancy.appointments === 1 ? "1 cita" : `${occupancy.appointments} citas`} · ${
                    occupancy.free === 1 ? "1 libre" : `${occupancy.free} libres`
                  }`;
            return (
              <li key={day}>
                <Link
                  href={day === today ? "/panel" : `/panel?dia=${day}`}
                  aria-current={day === today ? "date" : undefined}
                  className="grid min-h-16 gap-2 px-gutter py-3 transition-colors hover:bg-surface active:bg-surface"
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-label">
                      {formatDate(day)}
                      {day === today ? <span className="text-fg-muted"> · hoy</span> : null}
                    </span>
                    <span className="text-caption text-fg-muted tabular-nums">{detail}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="block h-1.5 overflow-hidden rounded-pill bg-surface-2"
                  >
                    <span
                      className="block h-full rounded-pill bg-fg-muted"
                      style={{ width: `${Math.round(occupancy.ratio * 100)}%` }}
                    />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
