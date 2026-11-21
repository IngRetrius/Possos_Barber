import type { Metadata } from "next";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { addDays, type AgendaAppointment } from "@possos/booking";
import { getAgendaAppointment, listCompleted, listPendingApproval } from "@possos/booking/server";
import { listChargesForAppointments, listCommissionRates } from "@possos/commissions/server";
import { reminderSummary, type ReminderSummary } from "@possos/notifications";
import { listMessageJobs } from "@possos/notifications/server";
import { Button, EmptyState } from "@possos/ui";
import { currentFormatters } from "../../../lib/i18n";
import { LocaleSwitch } from "../../_components/locale-switch";
import { loadPanel } from "../../../lib/panel";
import { isoDaysAgo, parseDay, todayKey } from "../../../lib/panel-dates";
import { param } from "../../../lib/session";
import { AgendaView } from "./_components/agenda-view";
import { BarberSwitcher } from "./_components/barber-switcher";
import { loadDayAgenda } from "./_lib/free-starts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("web.staff.meta"))("today") };
}

/**
 * "Hoy" (docs/11): la agenda del día como lista por hora, con "Cobros por registrar" y
 * "Pendientes de aprobar" cuando tienen algo. `?dia=YYYY-MM-DD` muestra otro día; `?cita=<id>` abre su hoja.
 */
export default async function TodayPage({ searchParams }: PageProps<"/panel">) {
  const params = await searchParams;
  const ctx = await loadPanel("/panel");
  const t = await getTranslations("web.staff.today");
  const f = await currentFormatters();
  const today = todayKey();
  const day = parseDay(param(params.dia)) ?? today;
  const isToday = day === today;

  if (!ctx.barber) {
    return (
      <main className="grid gap-6 px-gutter pt-safe pb-8">
        <div className="flex items-center justify-between gap-3 pt-4">
          <h1 className="text-title">{t("title")}</h1>
          <LocaleSwitch />
        </div>
        <EmptyState
          title={t("noBarbersTitle")}
          description={t("noBarbersBody")}
          action={
            <Button asChild variant="secondary">
              <Link href="/panel/barberos/nuevo">{t("createBarber")}</Link>
            </Button>
          }
        />
      </main>
    );
  }

  const barber = ctx.barber;
  const [dayAgenda, pending] = await Promise.all([
    loadDayAgenda(ctx.db, barber, day),
    isToday ? listPendingApproval(ctx.db, { barberId: barber.id }) : null,
  ]);
  const { items, appointments } = dayAgenda;

  // Cobros: los de las citas atendidas del día y las de los últimos 30 días que quedaron sin
  // cobro ("Cobros por registrar"). La cita que termina se cierra y se cobra sola; sin cobro
  // quedan las que no tienen precio ([PENDIENTE]) o las que se cerraron con más de 3 días.
  const since = isoDaysAgo(30);
  const [completed, rates] = await Promise.all([
    isToday ? listCompleted(ctx.db, { barberId: barber.id, since }) : null,
    listCommissionRates(ctx.db),
  ]);
  const recentCompleted = completed?.ok ? completed.data : [];
  const completedIds = [
    ...new Set([
      ...appointments.filter((a) => a.status === "completed").map((a) => a.id),
      ...recentCompleted.map((a) => a.id),
    ]),
  ];
  const charges = await listChargesForAppointments(ctx.db, completedIds);
  const charged = new Set((charges.ok ? charges.data : []).map((c) => c.appointment_id));
  const uncharged = charges.ok ? recentCompleted.filter((a) => !charged.has(a.id)) : [];

  const selectedId = param(params.cita) ?? null;
  let extra: AgendaAppointment | null = null;
  if (selectedId && !appointments.some((a) => a.id === selectedId)) {
    const found = await getAgendaAppointment(ctx.db, selectedId);
    extra = found.ok ? found.data : null;
  }

  // F7: el WhatsApp de las citas que se ven (RLS: las de la agenda de este barbero).
  const shownIds = [
    ...new Set([
      ...appointments.map((a) => a.id),
      ...(pending?.ok ? pending.data.map((a) => a.id) : []),
      ...(extra ? [extra.id] : []),
    ]),
  ];
  const jobs = await listMessageJobs(ctx.db, shownIds);
  const reminders: Record<string, ReminderSummary> = {};
  for (const id of shownIds) {
    const summary = reminderSummary(
      (jobs.ok ? jobs.data : []).filter((j) => j.appointment_id === id),
    );
    if (summary) reminders[id] = summary;
  }

  const count = appointments.length;
  const approving = pending?.ok ? pending.data.length : 0;
  const summary = [
    t("count", { count }),
    uncharged.length ? t("uncharged", { count: uncharged.length }) : null,
    approving ? t("toApprove", { count: approving }) : null,
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
            {isToday ? t("titleWithDate", { date: f.date(day) }) : f.date(day)}
          </h1>
          <div className="flex shrink-0 items-center gap-1">
            <Button asChild className="shrink-0 px-4">
              <Link href="/panel/cita/nueva">
                <Plus aria-hidden="true" strokeWidth={1.5} />
                {t("newAppointment")}
              </Link>
            </Button>
            <LocaleSwitch />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p role="status" aria-atomic="true" className="text-body text-fg-muted tabular-nums">
            {summary}
          </p>
          <nav aria-label={t("changeDay")} className="flex shrink-0 items-center">
            {isToday ? null : (
              <Button asChild variant="ghost" className="px-3">
                <Link href="/panel">{t("goToday")}</Link>
              </Button>
            )}
            <Button asChild variant="ghost" size="icon">
              <Link href={dayHref(addDays(day, -1))} aria-label={t("previousDay")}>
                <ChevronLeft strokeWidth={1.5} aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon">
              <Link href={dayHref(addDays(day, 1))} aria-label={t("nextDay")}>
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
          {t("loadError")}
        </p>
      ) : null}
      <AgendaView
        key={`${barber.id}-${day}`}
        barberId={barber.id}
        items={items}
        now={new Date().toISOString()}
        isToday={isToday}
        pending={pending?.ok ? pending.data : []}
        extra={extra}
        initialSelectedId={selectedId}
        notice={param(params.aviso) ?? null}
        charges={charges.ok ? charges.data : []}
        uncharged={uncharged}
        rates={Object.fromEntries(
          (rates.ok ? rates.data : []).map((r) => [r.barber_id, Number(r.barber_pct)]),
        )}
        viewerBarberId={ctx.viewer.barberId}
        isAdmin={ctx.viewer.isAdmin}
        today={today}
        reminders={reminders}
      />
    </main>
  );
}
