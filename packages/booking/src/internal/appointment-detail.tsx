import { MessageCircle } from "lucide-react";
import type { ReactNode } from "react";
import { whatsappChatUrl } from "@possos/customers";
import { Button, formatDateLong, formatTimeRange, StatusBadge } from "@possos/ui";
import type { AgendaAppointment } from "./agenda";
import { APPOINTMENT_STATUS_DISPLAY, TO_CLOSE_DISPLAY } from "./status";

export interface AppointmentDetailProps {
  appointment: AgendaAppointment;
  /** "$ 30.000" o "[PENDIENTE]". */
  priceLabel: string;
  /** Ya empezó y sigue sin marcar. */
  toClose: boolean;
  /** Lo que va debajo (cobro, notas del barbero). */
  children?: ReactNode;
}

/**
 * Detalle de una cita en la hoja del panel (docs/11): botón de WhatsApp, fecha y hora,
 * servicio, estado y valor. El celular solo lo ve el personal (regla 7).
 */
export function AppointmentDetail({
  appointment: a,
  priceLabel,
  toClose,
  children,
}: AppointmentDetailProps) {
  const display = toClose ? TO_CLOSE_DISPLAY : APPOINTMENT_STATUS_DISPLAY[a.status];
  const chat = whatsappChatUrl(a.customerPhone);
  return (
    <div className="grid gap-4">
      {chat ? (
        <Button asChild variant="secondary">
          <a href={chat} target="_blank" rel="noreferrer">
            <MessageCircle aria-hidden="true" strokeWidth={1.5} />
            WhatsApp<span className="sr-only"> de {a.customerName}</span>
          </a>
        </Button>
      ) : (
        <p className="text-caption text-fg-muted">Este cliente no tiene celular registrado.</p>
      )}
      <dl className="grid gap-3 rounded-card border border-border bg-surface p-4">
        <div className="grid gap-0.5">
          <dt className="text-caption text-fg-muted">Fecha y hora</dt>
          <dd className="text-label tabular-nums">
            {formatDateLong(a.start)}, {formatTimeRange(a.start, a.end)}
          </dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="text-caption text-fg-muted">Servicio</dt>
          <dd className="text-label">{a.serviceName}</dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="text-caption text-fg-muted">Estado</dt>
          <dd>
            <StatusBadge tone={display.tone}>{display.label}</StatusBadge>
          </dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="text-caption text-fg-muted">Valor de la reserva</dt>
          <dd className="text-label tabular-nums">{priceLabel}</dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="text-caption text-fg-muted">Origen</dt>
          <dd className="text-body">
            {a.source === "customer" ? "La reservó el cliente" : "La creó el personal"}
          </dd>
        </div>
      </dl>
      {children}
    </div>
  );
}
