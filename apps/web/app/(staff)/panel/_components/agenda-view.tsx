"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import type { AgendaAppointment, AgendaItem } from "@possos/booking";
import { AgendaList, AppointmentDetail, useLiveAgenda } from "@possos/booking/ui";
import { servicePriceLabel } from "@possos/catalog";
import { formatPercent, type Charge } from "@possos/commissions";
import { ChargeForm } from "@possos/commissions/ui";
import { reminderFailed, type ReminderSummary } from "@possos/notifications";
import { Button, InlineError, Sheet, toast, toDateKey, useFormat } from "@possos/ui";
import {
  attendAction,
  cancelAction,
  decideAction,
  noShowAction,
  notesAction,
  recordChargeAction,
  updateChargeAction,
  voidChargeAction,
  type ActionResult,
} from "../_actions/agenda";
import { useCloseThenNavigate } from "./close-then-navigate";
import { ReasonForm } from "./reason-form";
import { ReminderStatus } from "./reminder-status";

export interface AgendaViewProps {
  barberId: string;
  day: string;
  items: AgendaItem[];
  /** Instante del servidor al armar la página (ISO). */
  now: string;
  /** El día mostrado es hoy: línea de "ahora", "Por cerrar" y "Pendientes de aprobar". */
  isToday: boolean;
  toClose: AgendaAppointment[];
  pending: AgendaAppointment[];
  /** Cita fuera de la lista que se abre desde la URL (`?cita=`). */
  extra: AgendaAppointment | null;
  initialSelectedId: string | null;
  /** Aviso que llega en la URL después de crear o mover una cita. */
  notice: string | null;
  /** Cobros de las citas completadas que se muestran. */
  charges: Charge[];
  /** Citas atendidas sin cobro: "Falta registrar el cobro". */
  uncharged: AgendaAppointment[];
  /** Porcentaje vigente de cada barbero que la sesión ve. */
  rates: Record<string, number>;
  viewerBarberId: string | null;
  isAdmin: boolean;
  /** Hoy en Bogotá (`YYYY-MM-DD`): el barbero corrige solo los cobros de hoy. */
  today: string;
  /** El WhatsApp de cada cita que se muestra (F7); sin entrada, la cita no tiene mensajes. */
  reminders: Record<string, ReminderSummary>;
}

/** Avisos que llegan en la URL (`?aviso=`) y su texto en `web.agenda.notices`. */
const NOTICES = { "cita-creada": "created", "cita-movida": "moved" } as const;

type Mode = "detail" | "cancel" | "attend" | "record" | "correct" | "void";

const CHARGE_MODES: Mode[] = ["attend", "record", "correct"];

/**
 * Hora actual: la del servidor, y cada minuto la del reloj. Sin leer el reloj al renderizar (el
 * render debe ser puro): el intervalo guarda la hora en el estado.
 */
function useNow(serverNow: string): string {
  const [tick, setTick] = useState<string | null>(null);
  useEffect(() => {
    const timer = setInterval(() => setTick(new Date().toISOString()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return tick && tick > serverNow ? tick : serverNow;
}

export function AgendaView({
  barberId,
  day,
  items,
  now: serverNow,
  isToday,
  toClose,
  pending,
  extra,
  initialSelectedId,
  notice,
  charges,
  uncharged,
  rates,
  viewerBarberId,
  isAdmin,
  today,
  reminders,
}: AgendaViewProps) {
  const t = useTranslations("web.agenda");
  const f = useFormat();
  const router = useRouter();
  const now = useNow(serverNow);
  const nowMs = new Date(now).getTime();
  useLiveAgenda(barberId);

  const all = useMemo(() => {
    const map = new Map<string, AgendaAppointment>();
    for (const item of items)
      if (item.kind === "appointment") map.set(item.appointment.id, item.appointment);
    for (const a of [...toClose, ...pending, ...uncharged]) map.set(a.id, a);
    if (extra) map.set(extra.id, extra);
    return map;
  }, [items, toClose, pending, uncharged, extra]);
  const chargeOf = useMemo(() => new Map(charges.map((c) => [c.appointment_id, c])), [charges]);
  // Marca en la agenda las citas cuyo último WhatsApp falló (riesgo 4 de docs/10).
  const warnings = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(reminders)
          .filter(([, summary]) => reminderFailed(summary))
          .map(([id]) => [id, t("reminder.flag")]),
      ),
    [reminders, t],
  );

  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [mode, setMode] = useState<Mode>("detail");
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, startAction] = useTransition();
  const selected = selectedId ? (all.get(selectedId) ?? null) : null;
  const { close, navigate } = useCloseThenNavigate(() => setSelectedId(null));

  // Avisos que llegan en la URL: se muestran una vez y se quitan de la URL.
  useEffect(() => {
    const key = notice ? NOTICES[notice as keyof typeof NOTICES] : undefined;
    if (!key) return;
    const message = t(`notices.${key}`);
    // Con id: el modo estricto de React corre el efecto dos veces y Sonner no lo repite.
    toast(message, { id: notice! });
    const url = new URL(window.location.href);
    url.searchParams.delete("aviso");
    window.history.replaceState(window.history.state, "", url);
  }, [notice, t]);

  // La cita que se abrió desde la URL: al cerrar la hoja, sale de la URL.
  useEffect(() => {
    if (selectedId || !initialSelectedId) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("cita")) return;
    url.searchParams.delete("cita");
    window.history.replaceState(window.history.state, "", url);
  }, [selectedId, initialSelectedId]);

  const open = (id: string, nextMode: Mode = "detail") => {
    setError(null);
    setMode(nextMode);
    setSelectedId(id);
  };
  const toMode = (nextMode: Mode) => {
    setError(null);
    setMode(nextMode);
  };

  const run = (action: () => Promise<ActionResult>, closeAfter = true) => {
    setError(null);
    startAction(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.message) toast(result.message);
      if (closeAfter) close();
      router.refresh();
    });
  };

  const started = (a: AgendaAppointment) => new Date(a.start).getTime() <= nowMs;
  const isToClose = (a: AgendaAppointment) =>
    (a.status === "booked" || a.status === "confirmed") && started(a);

  return (
    <>
      {isToday && toClose.length + uncharged.length > 0 ? (
        <Section title={t("toClose", { count: toClose.length + uncharged.length })}>
          {toClose.map((a) => (
            <Card
              key={a.id}
              appointment={a}
              onOpen={() => open(a.id)}
              showDate={a.start.slice(0, 10) !== day}
            >
              <Button
                variant="secondary"
                disabled={pendingAction}
                onClick={() => open(a.id, "attend")}
              >
                {t("came")}
              </Button>
              <Button
                variant="secondary"
                className="text-danger"
                disabled={pendingAction}
                onClick={() => run(() => noShowAction(a.id), false)}
              >
                {t("noShow")}
              </Button>
            </Card>
          ))}
          {uncharged.map((a) => (
            <Card
              key={a.id}
              appointment={a}
              onOpen={() => open(a.id)}
              showDate
              note={t("chargeMissing")}
            >
              <Button
                variant="secondary"
                className="col-span-2"
                disabled={pendingAction}
                onClick={() => open(a.id, "record")}
              >
                {t("recordCharge")}
              </Button>
            </Card>
          ))}
        </Section>
      ) : null}

      {isToday && pending.length > 0 ? (
        <Section title={t("pending", { count: pending.length })}>
          {pending.map((a) => (
            <Card key={a.id} appointment={a} onOpen={() => open(a.id)} showDate>
              <Button
                variant="secondary"
                disabled={pendingAction}
                onClick={() => run(() => decideAction(a.id, true), false)}
              >
                {t("approve")}
              </Button>
              <Button
                variant="secondary"
                className="text-danger"
                disabled={pendingAction}
                onClick={() => run(() => decideAction(a.id, false), false)}
              >
                {t("reject")}
              </Button>
            </Card>
          ))}
        </Section>
      ) : null}

      {items.length === 0 ? (
        <p className="mx-gutter rounded-card border border-border px-4 py-6 text-body text-fg-muted">
          {t("emptyDay")}
        </p>
      ) : (
        <AgendaList
          items={items}
          now={isToday ? now : null}
          onSelect={open}
          freeHref={(start) => `/panel/cita/nueva?hora=${encodeURIComponent(start)}`}
          warnings={warnings}
          className="border-y border-border"
        />
      )}

      <Sheet
        open={selected !== null}
        onOpenChange={(next) => {
          if (!next) setSelectedId(null);
        }}
        title={
          CHARGE_MODES.includes(mode)
            ? t("sheet.charge")
            : mode === "void"
              ? t("sheet.void")
              : (selected?.customerName ?? t("sheet.appointment"))
        }
        description={
          selected
            ? CHARGE_MODES.includes(mode) || mode === "void"
              ? `${selected.customerName} · ${selected.serviceName}`
              : `${selected.serviceName} · ${f.date(selected.start)}, ${f.time(selected.start)}`
            : undefined
        }
      >
        {selected ? (
          CHARGE_MODES.includes(mode) ? (
            <ChargeForm
              key={`${selected.id}-${mode}`}
              defaultAmount={
                mode === "correct"
                  ? (chargeOf.get(selected.id)?.amount_cop ?? null)
                  : selected.priceCop
              }
              barberPct={
                mode === "correct"
                  ? (chargeOf.get(selected.id)?.barber_pct ?? null)
                  : (rates[selected.barberId] ?? null)
              }
              barberLabel={selected.barberId === viewerBarberId ? t("forYou") : t("forBarber")}
              submitLabel={mode === "correct" ? t("saveValue") : t("saveCharge")}
              pendingLabel={t("saving")}
              pending={pendingAction}
              error={error}
              onCancel={() => toMode("detail")}
              onSubmit={(amount) => {
                const charge = chargeOf.get(selected.id);
                if (mode === "attend") run(() => attendAction(selected.id, amount));
                else if (mode === "record") run(() => recordChargeAction(selected.id, amount));
                else if (charge) run(() => updateChargeAction(charge.id, amount));
              }}
            />
          ) : mode === "void" ? (
            <ReasonForm
              question={t("voidQuestion")}
              confirmLabel={t("voidConfirm")}
              pendingLabel={t("voiding")}
              pending={pendingAction}
              error={error}
              onBack={() => toMode("detail")}
              onConfirm={(reason) => {
                const charge = chargeOf.get(selected.id);
                if (charge) run(() => voidChargeAction(charge.id, reason));
              }}
            />
          ) : mode === "cancel" ? (
            <ReasonForm
              question={t("cancelQuestion")}
              confirmLabel={t("cancelConfirm")}
              pendingLabel={t("cancelling")}
              backLabel={t("cancelBack")}
              pending={pendingAction}
              error={error}
              onBack={() => toMode("detail")}
              onConfirm={(reason) => run(() => cancelAction(selected.id, reason))}
            />
          ) : (
            <AppointmentDetail
              appointment={selected}
              priceLabel={servicePriceLabel(selected.priceCop, f.locale)}
              toClose={isToClose(selected)}
            >
              <ReminderStatus summary={reminders[selected.id] ?? null} />
              {selected.status === "completed" ? (
                <ChargeSummary
                  charge={chargeOf.get(selected.id) ?? null}
                  canCorrect={(c) => !c.voided_at && (isAdmin || toDateKey(c.charged_at) === today)}
                  isAdmin={isAdmin}
                  disabled={pendingAction}
                  onRecord={() => toMode("record")}
                  onCorrect={() => toMode("correct")}
                  onVoid={() => toMode("void")}
                />
              ) : null}
              {error ? <InlineError>{error}</InlineError> : null}
              <Actions
                appointment={selected}
                started={started(selected)}
                disabled={pendingAction}
                onApprove={() => run(() => decideAction(selected.id, true))}
                onReject={() => run(() => decideAction(selected.id, false))}
                onAttend={() => toMode("attend")}
                onNoShow={() => run(() => noShowAction(selected.id))}
                onMove={() => navigate(`/panel/cita/${selected.id}/mover`)}
                onCancel={() => {
                  setError(null);
                  setMode("cancel");
                }}
              />
              <Notes
                key={selected.id}
                customerId={selected.customerId}
                barberId={selected.barberId}
              />
            </AppointmentDetail>
          )
        ) : null}
      </Sheet>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 px-gutter">
      <h2 className="text-heading">{title}</h2>
      <ul className="grid gap-3">{children}</ul>
    </section>
  );
}

function Card({
  appointment: a,
  onOpen,
  showDate,
  note,
  children,
}: {
  appointment: AgendaAppointment;
  onOpen: () => void;
  showDate?: boolean;
  /** Aviso en ámbar ("Falta registrar el cobro"). */
  note?: string;
  children: ReactNode;
}) {
  const f = useFormat();
  return (
    <li className="grid gap-3 rounded-card border border-border bg-surface p-4">
      <button type="button" onClick={onOpen} className="grid gap-0.5 text-left">
        <span className="text-label tabular-nums">
          {showDate ? `${f.date(a.start)}, ` : ""}
          {f.time(a.start)} · {a.customerName}
        </span>
        <span className="text-caption text-fg-muted">{a.serviceName}</span>
        {note ? <span className="text-caption text-warning">{note}</span> : null}
      </button>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </li>
  );
}

function Actions({
  appointment: a,
  started,
  disabled,
  onApprove,
  onReject,
  onAttend,
  onNoShow,
  onMove,
  onCancel,
}: {
  appointment: AgendaAppointment;
  started: boolean;
  disabled: boolean;
  onApprove: () => void;
  onReject: () => void;
  onAttend: () => void;
  onNoShow: () => void;
  onMove: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("web.agenda");
  const open = a.status === "pending_approval" || a.status === "booked" || a.status === "confirmed";
  if (!open) return null;
  return (
    <div className="grid grid-cols-2 gap-2">
      {a.status === "pending_approval" ? (
        <>
          <Button variant="secondary" disabled={disabled} onClick={onApprove}>
            {t("approve")}
          </Button>
          <Button
            variant="secondary"
            className="text-danger"
            disabled={disabled}
            onClick={onReject}
          >
            {t("reject")}
          </Button>
        </>
      ) : started ? (
        <>
          <Button disabled={disabled} onClick={onAttend}>
            {t("came")}
          </Button>
          <Button
            variant="secondary"
            className="text-danger"
            disabled={disabled}
            onClick={onNoShow}
          >
            {t("noShow")}
          </Button>
        </>
      ) : null}
      <Button variant="secondary" disabled={disabled} onClick={onMove}>
        {t("move")}
      </Button>
      <Button variant="secondary" className="text-danger" disabled={disabled} onClick={onCancel}>
        {t("cancel")}
      </Button>
    </div>
  );
}

/** El cobro de una cita completada: valor y reparto, o "Registrar cobro" si falta. */
function ChargeSummary({
  charge,
  canCorrect,
  isAdmin,
  disabled,
  onRecord,
  onCorrect,
  onVoid,
}: {
  charge: Charge | null;
  canCorrect: (charge: Charge) => boolean;
  isAdmin: boolean;
  disabled: boolean;
  onRecord: () => void;
  onCorrect: () => void;
  onVoid: () => void;
}) {
  const t = useTranslations("web.agenda");
  const f = useFormat();
  if (!charge) {
    return (
      <div className="grid gap-3 rounded-card border border-border bg-surface p-4">
        <p className="text-body text-warning">{t("chargeMissing")}</p>
        <Button variant="secondary" disabled={disabled} onClick={onRecord}>
          {t("recordCharge")}
        </Button>
      </div>
    );
  }
  const voided = Boolean(charge.voided_at);
  return (
    <section
      aria-label={t("charge")}
      className="grid gap-3 rounded-card border border-border bg-surface p-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-label">{t("charge")}</h3>
        <span
          className={
            voided
              ? "text-label tabular-nums line-through text-fg-muted"
              : "text-label tabular-nums"
          }
        >
          {f.price(charge.amount_cop)}
        </span>
      </div>
      {voided ? (
        <p className="text-caption text-fg-muted">
          {t("voided", { reason: charge.void_reason ?? "" })}
        </p>
      ) : (
        <p className="text-caption text-fg-muted tabular-nums">
          {t("split", {
            barber: f.price(charge.barber_amount_cop ?? 0),
            pct: formatPercent(charge.barber_pct, f.locale),
            business: f.price(charge.business_amount_cop ?? 0),
          })}
        </p>
      )}
      {!voided && (canCorrect(charge) || isAdmin) ? (
        <div className="grid grid-cols-2 gap-2">
          {canCorrect(charge) ? (
            <Button variant="secondary" disabled={disabled} onClick={onCorrect}>
              {t("correct")}
            </Button>
          ) : null}
          {isAdmin ? (
            <Button
              variant="secondary"
              className="text-danger"
              disabled={disabled}
              onClick={onVoid}
            >
              {t("sheet.void")}
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function Notes({ customerId, barberId }: { customerId: string; barberId: string }) {
  const t = useTranslations("web.agenda");
  const f = useFormat();
  const [notes, setNotes] = useState<{ id: string; body: string; created_at: string }[] | null>(
    null,
  );
  useEffect(() => {
    let alive = true;
    void notesAction(customerId, barberId).then((list) => {
      if (alive) setNotes(list);
    });
    return () => {
      alive = false;
    };
  }, [customerId, barberId]);
  return (
    <section className="grid gap-2" aria-label={t("notesLabel")}>
      <h3 className="text-label">{t("notesTitle")}</h3>
      {notes === null ? (
        <p className="text-caption text-fg-muted">{t("loading")}</p>
      ) : notes.length === 0 ? (
        <p className="text-caption text-fg-muted">{t("noNotes")}</p>
      ) : (
        <ul className="grid gap-2">
          {notes.map((n) => (
            <li key={n.id} className="rounded-card border border-border p-3 text-body">
              {n.body}
              <span className="mt-1 block text-caption text-fg-muted">{f.date(n.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
