import type { Metadata } from "next";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { addDays, type AgendaAppointment } from "@possos/booking";
import { getAgendaAppointment, listPendingApproval, listToClose } from "@possos/booking/server";
import { Button, EmptyState, formatDate } from "@possos/ui";
import { loadPanel } from "../../../lib/panel";
import { parseDay, todayKey } from "../../../lib/panel-dates";
import { param } from "../../../lib/session";
import { AgendaView } from "./_components/agenda-view";
import { BarberSwitcher } from "./_components/barber-switcher";
import { loadDayAgenda } from "./_lib/free-starts";

export const metadata: Metadata = { title: "Hoy · Panel · Possos Barber" };

/**
 * "Hoy" (docs/11): la agenda del día como lista por hora, con "Por cerrar" y "Pendientes de
 * aprobar" cuando tienen algo. `?dia=YYYY-MM-DD` muestra otro día; `?cita=<id>` abre su hoja.
 */
export default async function TodayPage({ searchParams }: PageProps<"/panel">) {
  const params = await searchParams;
  const ctx = await loadPanel("/panel");
  const today = todayKey();
  const day = parseDay(param(params.dia)) ?? today;
  const isToday = day === today;

  if (!ctx.barber) {
    return (
      <main className="grid gap-6 px-gutter pt-safe pb-8">
        <h1 className="pt-4 text-title">Hoy</h1>
        <EmptyState
          title="Todavía no hay barberos"
          description="Crea el primero para tener agenda."
          action={
            <Button asChild variant="secondary">
              <Link href="/panel/barberos/nuevo">Crear un barbero</Link>
            </Button>
          }
        />
      </main>
    );
  }

  const barber = ctx.barber;
  const [dayAgenda, toClose, pending] = await Promise.all([
    loadDayAgenda(ctx.db, barber, day),
    isToday ? listToClose(ctx.db, { barberId: barber.id }) : null,
    isToday ? listPendingApproval(ctx.db, { barberId: barber.id }) : null,
  ]);
  const { items, appointments } = dayAgenda;

  const selectedId = param(params.cita) ?? null;
  let extra: AgendaAppointment | null = null;
  if (selectedId && !appointments.some((a) => a.id === selectedId)) {
    const found = await getAgendaAppointment(ctx.db, selectedId);
    extra = found.ok ? found.data : null;
  }

  const count = appointments.length;
  const unconfirmed = appointments.filter((a) => a.status === "booked").length;
  const closing = toClose?.ok ? toClose.data.length : 0;
  const approving = pending?.ok ? pending.data.length : 0;
  const summary = [
    count === 1 ? "1 cita" : `${count} citas`,
    unconfirmed ? `${unconfirmed} sin confirmar` : null,
    closing ? `${closing} por cerrar` : null,
    approving ? `${approving} por aprobar` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const loadError = !dayAgenda.ok;
  const dayHref = (d: string) => (d === today ? "/panel" : `/panel?dia=${d}`);

  return (
    <main className="grid content-start gap-5 pb-6">
      <header className="grid gap-1 px-gutter pt-safe">
        <div className="flex items-center justify-between gap-3 pt-4">
          <h1 className="text-title tabular-nums">
            {isToday ? `Hoy · ${formatDate(day)}` : formatDate(day)}
          </h1>
          <Button asChild className="shrink-0 px-4">
            <Link href="/panel/cita/nueva">
              <Plus aria-hidden="true" strokeWidth={1.5} />
              Cita
            </Link>
          </Button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p role="status" aria-atomic="true" className="text-body text-fg-muted tabular-nums">
            {summary}
          </p>
          <nav aria-label="Cambiar de día" className="flex shrink-0 items-center">
            {isToday ? null : (
              <Button asChild variant="ghost" className="px-3">
                <Link href="/panel">Hoy</Link>
              </Button>
            )}
            <Button asChild variant="ghost" size="icon">
              <Link href={dayHref(addDays(day, -1))} aria-label="Día anterior">
                <ChevronLeft strokeWidth={1.5} aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon">
              <Link href={dayHref(addDays(day, 1))} aria-label="Día siguiente">
                <ChevronRight strokeWidth={1.5} aria-hidden="true" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>
      {ctx.viewer.isAdmin && (ctx.barbers.length > 1 || !ctx.viewer.barberId) ? (
        <BarberSwitcher
          value={barber.id}
          barbers={ctx.barbers.map((b) => ({ id: b.id, name: b.display_name, active: b.active }))}
        />
      ) : null}
      {loadError ? (
        <p role="alert" className="px-gutter text-body text-danger">
          No pudimos cargar la agenda. Revisa tu conexión e intenta de nuevo
        </p>
      ) : null}
      <AgendaView
        key={`${barber.id}-${day}`}
        barberId={barber.id}
        day={day}
        items={items}
        now={new Date().toISOString()}
        isToday={isToday}
        toClose={toClose?.ok ? toClose.data : []}
        pending={pending?.ok ? pending.data : []}
        extra={extra}
        initialSelectedId={selectedId}
        notice={param(params.aviso) ?? null}
      />
    </main>
  );
}
