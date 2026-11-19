import type { Metadata } from "next";
import { holidaysBetween } from "@possos/barbers";
import { listTimeOff } from "@possos/barbers/server";
import { TimeOffForm } from "@possos/barbers/ui";
import { addDays, dayBounds, parsePeriod } from "@possos/booking";
import { Button, formatDate, formatDateLong, formatTime } from "@possos/ui";
import { loadPanel } from "../../../../lib/panel";
import { todayKey } from "../../../../lib/panel-dates";
import { blockHolidayAction, createTimeOffAction, deleteTimeOffAction } from "../_actions/schedule";
import { BarberSwitcher } from "../_components/barber-switcher";
import { PanelHeader } from "../_components/panel-header";

export const metadata: Metadata = { title: "Bloqueos · Panel · Possos Barber" };

/** Días que se miran hacia adelante para bloqueos y festivos. */
const HORIZON_DAYS = 180;

/**
 * Bloqueos (docs/11, "Más"): crear, ver y borrar, y los festivos de Colombia de los próximos
 * meses como sugerencia para aceptar o no.
 */
export default async function TimeOffPage() {
  const ctx = await loadPanel("/panel/bloqueos");
  const barber = ctx.barber;
  const today = todayKey();
  const until = addDays(today, HORIZON_DAYS);
  const list = barber
    ? await listTimeOff(ctx.db, {
        barberId: barber.id,
        from: new Date().toISOString(),
        to: dayBounds(until).to,
      })
    : null;
  const blocks = (list?.ok ? list.data : []).flatMap((b) => {
    const period = parsePeriod(b.period);
    return period ? [{ ...b, ...period }] : [];
  });
  const covered = (day: string) => {
    const { from, to } = dayBounds(day);
    return blocks.some((b) => b.start <= from && b.end >= to);
  };
  const holidays = holidaysBetween(today, until);

  const describe = (b: { start: string; end: string }) => {
    const midnight = formatTime(dayBounds(today).from);
    const startsMidnight = formatTime(b.start) === midnight;
    const endsMidnight = formatTime(b.end) === midnight;
    if (startsMidnight && endsMidnight) {
      const first = formatDate(b.start);
      const last = formatDate(new Date(new Date(b.end).getTime() - 1).toISOString());
      return first === last ? `${first}, todo el día` : `${first} a ${last}, todo el día`;
    }
    return `${formatDate(b.start)}, ${formatTime(b.start)} a ${
      formatDate(b.end) === formatDate(b.start) ? "" : `${formatDate(b.end)}, `
    }${formatTime(b.end)}`;
  };

  return (
    <>
      <PanelHeader title="Bloqueos" backHref="/panel/mas" />
      <main className="grid content-start gap-8 px-gutter pb-8">
        {barber && ctx.viewer.isAdmin && (ctx.barbers.length > 1 || !ctx.viewer.barberId) ? (
          <div className="-mx-gutter">
            <BarberSwitcher
              value={barber.id}
              barbers={ctx.barbers.map((b) => ({
                id: b.id,
                name: b.display_name,
                active: b.active,
              }))}
            />
          </div>
        ) : null}
        {!barber ? (
          <p className="text-body text-fg-muted">Todavía no hay barberos.</p>
        ) : (
          <>
            <section className="grid gap-3">
              <h2 className="text-heading">Nuevo bloqueo</h2>
              <TimeOffForm
                key={barber.id}
                action={createTimeOffAction}
                barberId={barber.id}
                defaultDate={today}
              />
            </section>

            <section className="grid gap-3">
              <h2 className="text-heading">Próximos bloqueos</h2>
              {!list?.ok ? (
                <p role="alert" className="text-body text-danger">
                  No pudimos cargar los bloqueos. Revisa tu conexión e intenta de nuevo
                </p>
              ) : blocks.length === 0 ? (
                <p className="text-body text-fg-muted">No tienes bloqueos.</p>
              ) : (
                <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
                  {blocks.map((b) => (
                    <li key={b.id} className="flex min-h-16 items-center gap-3 px-4 py-2">
                      <span className="grid min-w-0 flex-1 gap-0.5">
                        <span className="text-label tabular-nums">{describe(b)}</span>
                        {b.reason ? (
                          <span className="truncate text-caption text-fg-muted">{b.reason}</span>
                        ) : null}
                      </span>
                      <form action={deleteTimeOffAction}>
                        <input type="hidden" name="bloqueo" value={b.id} />
                        <Button type="submit" variant="ghost" className="px-3 text-danger">
                          Borrar<span className="sr-only"> el bloqueo del {describe(b)}</span>
                        </Button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="grid gap-3">
              <h2 className="text-heading">Festivos</h2>
              <p className="text-body text-fg-muted">
                Festivos de Colombia de los próximos meses. Bloquea los que no vas a atender.
              </p>
              <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
                {holidays.map((h) => (
                  <li key={h.date} className="flex min-h-16 items-center gap-3 px-4 py-2">
                    <span className="grid min-w-0 flex-1 gap-0.5">
                      <span className="text-label">{h.name}</span>
                      <span className="text-caption text-fg-muted">{formatDateLong(h.date)}</span>
                    </span>
                    {covered(h.date) ? (
                      <span className="text-caption text-fg-muted">Bloqueado</span>
                    ) : (
                      <form action={blockHolidayAction}>
                        <input type="hidden" name="barbero" value={barber.id} />
                        <input type="hidden" name="fecha" value={h.date} />
                        <Button type="submit" variant="secondary" className="px-4">
                          Bloquear<span className="sr-only"> el {formatDateLong(h.date)}</span>
                        </Button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </main>
    </>
  );
}
