"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import type { AgendaAppointment, AgendaItem } from "@possos/booking";
import { AgendaList, AppointmentDetail, useLiveAgenda } from "@possos/booking/ui";
import { servicePriceLabel } from "@possos/catalog";
import {
  Button,
  Field,
  formatDate,
  formatTime,
  InlineError,
  Sheet,
  Textarea,
  toast,
} from "@possos/ui";
import {
  cancelAction,
  decideAction,
  noShowAction,
  notesAction,
  type ActionResult,
} from "../_actions/agenda";
import { useCloseThenNavigate } from "./close-then-navigate";

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
}

const NOTICES: Record<string, string> = {
  "cita-creada": "Creaste la cita",
  "cita-movida": "Moviste la cita",
};

type Mode = "detail" | "cancel";

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
}: AgendaViewProps) {
  const router = useRouter();
  const now = useNow(serverNow);
  const nowMs = new Date(now).getTime();
  useLiveAgenda(barberId);

  const all = useMemo(() => {
    const map = new Map<string, AgendaAppointment>();
    for (const item of items)
      if (item.kind === "appointment") map.set(item.appointment.id, item.appointment);
    for (const a of [...toClose, ...pending]) map.set(a.id, a);
    if (extra) map.set(extra.id, extra);
    return map;
  }, [items, toClose, pending, extra]);

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

  const open = (id: string) => {
    setError(null);
    setMode("detail");
    setSelectedId(id);
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
      {isToday && toClose.length > 0 ? (
        <Section title={`Por cerrar (${toClose.length})`}>
          {toClose.map((a) => (
            <Card
              key={a.id}
              appointment={a}
              onOpen={() => open(a.id)}
              showDate={a.start.slice(0, 10) !== day}
            >
              <Button variant="secondary" onClick={() => open(a.id)}>
                Ver
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
        title={selected?.customerName ?? "Cita"}
        description={
          selected
            ? `${selected.serviceName} · ${formatDate(selected.start)}, ${formatTime(selected.start)}`
            : undefined
        }
      >
        {selected ? (
          mode === "cancel" ? (
            <CancelForm
              pending={pendingAction}
              error={error}
              onBack={() => {
                setError(null);
                setMode("detail");
              }}
              onCancel={(reason) => run(() => cancelAction(selected.id, reason))}
            />
          ) : (
            <AppointmentDetail
              appointment={selected}
              priceLabel={servicePriceLabel(selected.priceCop)}
              toClose={isToClose(selected)}
            >
              {error ? <InlineError>{error}</InlineError> : null}
              <Actions
                appointment={selected}
                started={started(selected)}
                disabled={pendingAction}
                onApprove={() => run(() => decideAction(selected.id, true))}
                onReject={() => run(() => decideAction(selected.id, false))}
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
  children,
}: {
  appointment: AgendaAppointment;
  onOpen: () => void;
  showDate?: boolean;
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
  onNoShow,
  onMove,
  onCancel,
}: {
  appointment: AgendaAppointment;
  started: boolean;
  disabled: boolean;
  onApprove: () => void;
  onReject: () => void;
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
        <Button
          variant="secondary"
          className="col-span-2 text-danger"
          disabled={disabled}
          onClick={onNoShow}
        >
          No vino
        </Button>
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

function CancelForm({
  pending,
  error,
  onBack,
  onCancel,
}: {
  pending: boolean;
  error: string | null;
  onBack: () => void;
  onCancel: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [missing, setMissing] = useState(false);
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!reason.trim()) {
          setMissing(true);
          return;
        }
        onCancel(reason);
      }}
    >
      <p className="text-body">¿Cancelar esta cita? La hora queda libre para otros clientes.</p>
      <Field label="Motivo" error={missing ? "Escribe el motivo" : undefined}>
        <Textarea
          name="motivo"
          value={reason}
          maxLength={200}
          onChange={(e) => {
            setReason(e.target.value);
            setMissing(false);
          }}
        />
      </Field>
      {error ? <InlineError>{error}</InlineError> : null}
      <div className="grid gap-2">
        <Button type="submit" variant="danger" disabled={pending} aria-busy={pending}>
          {pending ? "Cancelando..." : "Sí, cancelar la cita"}
        </Button>
        <Button type="button" variant="ghost" onClick={onBack}>
          No, volver
        </Button>
      </div>
    </form>
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
