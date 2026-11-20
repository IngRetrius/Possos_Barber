"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import type { AgendaAppointment, AgendaItem } from "@possos/booking";
import { AgendaList, AppointmentDetail, useLiveAgenda } from "@possos/booking/ui";
import { servicePriceLabel } from "@possos/catalog";
import { formatPercent, type Charge } from "@possos/commissions";
import { ChargeForm } from "@possos/commissions/ui";
import {
  Button,
  formatDate,
  formatPrice,
  formatTime,
  InlineError,
  Sheet,
  toast,
  toDateKey,
} from "@possos/ui";
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
}

const NOTICES: Record<string, string> = {
  "cita-creada": "Creaste la cita",
  "cita-movida": "Moviste la cita",
};

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
}: AgendaViewProps) {
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

  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [mode, setMode] = useState<Mode>("detail");
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, startAction] = useTransition();
  const selected = selectedId ? (all.get(selectedId) ?? null) : null;
  const { close, navigate } = useCloseThenNavigate(() => setSelectedId(null));

  // Avisos que llegan en la URL: se muestran una vez y se quitan de la URL.
  useEffect(() => {
    const message = notice ? NOTICES[notice] : null;
    if (!message) return;
    // Con id: el modo estricto de React corre el efecto dos veces y Sonner no lo repite.
    toast(message, { id: notice! });
    const url = new URL(window.location.href);
    url.searchParams.delete("aviso");
    window.history.replaceState(window.history.state, "", url);
  }, [notice]);

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
        <Section title={`Por cerrar (${toClose.length + uncharged.length})`}>
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
                Vino
              </Button>
              <Button
                variant="secondary"
                className="text-danger"
                disabled={pendingAction}
                onClick={() => run(() => noShowAction(a.id), false)}
              >
                No vino
              </Button>
            </Card>
          ))}
          {uncharged.map((a) => (
            <Card
              key={a.id}
              appointment={a}
              onOpen={() => open(a.id)}
              showDate
              note="Falta registrar el cobro"
            >
              <Button
                variant="secondary"
                className="col-span-2"
                disabled={pendingAction}
                onClick={() => open(a.id, "record")}
              >
                Registrar cobro
              </Button>
            </Card>
          ))}
        </Section>
      ) : null}

      {isToday && pending.length > 0 ? (
        <Section title={`Pendientes de aprobar (${pending.length})`}>
          {pending.map((a) => (
            <Card key={a.id} appointment={a} onOpen={() => open(a.id)} showDate>
              <Button
                variant="secondary"
                disabled={pendingAction}
                onClick={() => run(() => decideAction(a.id, true), false)}
              >
                Aprobar
              </Button>
              <Button
                variant="secondary"
                className="text-danger"
                disabled={pendingAction}
                onClick={() => run(() => decideAction(a.id, false), false)}
              >
                Rechazar
              </Button>
            </Card>
          ))}
        </Section>
      ) : null}

      {items.length === 0 ? (
        <p className="mx-gutter rounded-card border border-border px-4 py-6 text-body text-fg-muted">
          Este día no tiene horario de atención ni citas. Puedes cambiar el horario en Más.
        </p>
      ) : (
        <AgendaList
          items={items}
          now={isToday ? now : null}
          onSelect={open}
          freeHref={(start) => `/panel/cita/nueva?hora=${encodeURIComponent(start)}`}
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
            ? "Cobro"
            : mode === "void"
              ? "Anular cobro"
              : (selected?.customerName ?? "Cita")
        }
        description={
          selected
            ? CHARGE_MODES.includes(mode) || mode === "void"
              ? `${selected.customerName} · ${selected.serviceName}`
              : `${selected.serviceName} · ${formatDate(selected.start)}, ${formatTime(selected.start)}`
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
              barberLabel={selected.barberId === viewerBarberId ? "Para ti" : "Para el barbero"}
              submitLabel={mode === "correct" ? "Guardar el valor" : "Guardar cobro"}
              pendingLabel="Guardando..."
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
              question="¿Anular este cobro? Deja de contar en la liquidación, pero no se borra."
              confirmLabel="Sí, anular el cobro"
              pendingLabel="Anulando..."
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
              question="¿Cancelar esta cita? La hora queda libre para otros clientes."
              confirmLabel="Sí, cancelar la cita"
              pendingLabel="Cancelando..."
              backLabel="No, volver"
              pending={pendingAction}
              error={error}
              onBack={() => toMode("detail")}
              onConfirm={(reason) => run(() => cancelAction(selected.id, reason))}
            />
          ) : (
            <AppointmentDetail
              appointment={selected}
              priceLabel={servicePriceLabel(selected.priceCop)}
              toClose={isToClose(selected)}
            >
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
  return (
    <li className="grid gap-3 rounded-card border border-border bg-surface p-4">
      <button type="button" onClick={onOpen} className="grid gap-0.5 text-left">
        <span className="text-label tabular-nums">
          {showDate ? `${formatDate(a.start)}, ` : ""}
          {formatTime(a.start)} · {a.customerName}
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
  const open = a.status === "pending_approval" || a.status === "booked" || a.status === "confirmed";
  if (!open) return null;
  return (
    <div className="grid grid-cols-2 gap-2">
      {a.status === "pending_approval" ? (
        <>
          <Button variant="secondary" disabled={disabled} onClick={onApprove}>
            Aprobar
          </Button>
          <Button
            variant="secondary"
            className="text-danger"
            disabled={disabled}
            onClick={onReject}
          >
            Rechazar
          </Button>
        </>
      ) : started ? (
        <>
          <Button disabled={disabled} onClick={onAttend}>
            Vino
          </Button>
          <Button
            variant="secondary"
            className="text-danger"
            disabled={disabled}
            onClick={onNoShow}
          >
            No vino
          </Button>
        </>
      ) : null}
      <Button variant="secondary" disabled={disabled} onClick={onMove}>
        Mover
      </Button>
      <Button variant="secondary" className="text-danger" disabled={disabled} onClick={onCancel}>
        Cancelar
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
  if (!charge) {
    return (
      <div className="grid gap-3 rounded-card border border-border bg-surface p-4">
        <p className="text-body text-warning">Falta registrar el cobro</p>
        <Button variant="secondary" disabled={disabled} onClick={onRecord}>
          Registrar cobro
        </Button>
      </div>
    );
  }
  const voided = Boolean(charge.voided_at);
  return (
    <section
      aria-label="Cobro"
      className="grid gap-3 rounded-card border border-border bg-surface p-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-label">Cobro</h3>
        <span
          className={
            voided
              ? "text-label tabular-nums line-through text-fg-muted"
              : "text-label tabular-nums"
          }
        >
          {formatPrice(charge.amount_cop)}
        </span>
      </div>
      {voided ? (
        <p className="text-caption text-fg-muted">Anulado: {charge.void_reason}</p>
      ) : (
        <p className="text-caption text-fg-muted tabular-nums">
          Barbero {formatPrice(charge.barber_amount_cop ?? 0)} ({formatPercent(charge.barber_pct)})
          · Barbería {formatPrice(charge.business_amount_cop ?? 0)}
        </p>
      )}
      {!voided && (canCorrect(charge) || isAdmin) ? (
        <div className="grid grid-cols-2 gap-2">
          {canCorrect(charge) ? (
            <Button variant="secondary" disabled={disabled} onClick={onCorrect}>
              Corregir valor
            </Button>
          ) : null}
          {isAdmin ? (
            <Button
              variant="secondary"
              className="text-danger"
              disabled={disabled}
              onClick={onVoid}
            >
              Anular cobro
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function Notes({ customerId, barberId }: { customerId: string; barberId: string }) {
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
    <section className="grid gap-2" aria-label="Notas del barbero">
      <h3 className="text-label">Notas sobre el cliente</h3>
      {notes === null ? (
        <p className="text-caption text-fg-muted">Cargando...</p>
      ) : notes.length === 0 ? (
        <p className="text-caption text-fg-muted">Sin notas.</p>
      ) : (
        <ul className="grid gap-2">
          {notes.map((n) => (
            <li key={n.id} className="rounded-card border border-border p-3 text-body">
              {n.body}
              <span className="mt-1 block text-caption text-fg-muted">
                {formatDate(n.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
