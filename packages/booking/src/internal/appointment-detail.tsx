import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { whatsappChatUrl } from "@possos/customers";
import { Button, StatusBadge, useFormat } from "@possos/ui";
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
  const t = useTranslations("booking.detail");
  const f = useFormat();
  const display = toClose
    ? TO_CLOSE_DISPLAY[f.locale]
    : APPOINTMENT_STATUS_DISPLAY[f.locale][a.status];
  const chat = whatsappChatUrl(a.customerPhone);
  return (
    <div className="grid gap-4">
      {chat ? (
        <Button asChild variant="secondary">
          <a href={chat} target="_blank" rel="noreferrer">
            <MessageCircle aria-hidden="true" strokeWidth={1.5} />
            WhatsApp<span className="sr-only">{t("whatsappOf", { name: a.customerName })}</span>
          </a>
        </Button>
      ) : (
        <p className="text-caption text-fg-muted">{t("noPhone")}</p>
      )}
      <dl className="grid gap-3 rounded-card border border-border bg-surface p-4">
        <div className="grid gap-0.5">
          <dt className="text-caption text-fg-muted">{t("when")}</dt>
          <dd className="text-label tabular-nums">
            {f.dateLong(a.start)}, {f.timeRange(a.start, a.end)}
          </dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="text-caption text-fg-muted">{t("service")}</dt>
          <dd className="text-label">{a.serviceName}</dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="text-caption text-fg-muted">{t("status")}</dt>
          <dd>
            <StatusBadge tone={display.tone}>{display.label}</StatusBadge>
          </dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="text-caption text-fg-muted">{t("price")}</dt>
          <dd className="text-label tabular-nums">{priceLabel}</dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="text-caption text-fg-muted">{t("source")}</dt>
          <dd className="text-body">{a.source === "customer" ? t("byCustomer") : t("byStaff")}</dd>
        </div>
      </dl>
      {children}
    </div>
  );
}
