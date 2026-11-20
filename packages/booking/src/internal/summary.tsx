import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn, useFormat } from "@possos/ui";

export interface AppointmentSummaryProps {
  serviceName: string;
  /** Inicio y fin (ISO). */
  start: string;
  end: string;
  /** Nombre del barbero, o null con "Cualquiera disponible" antes de reservar. */
  barberName: string | null;
  /** "$ 30.000" o "[PENDIENTE]". */
  priceLabel: string;
  /** Dirección de la barbería o "[PENDIENTE]". */
  location: string;
  /** Lo que va al final de la tarjeta (estado de la cita). */
  footer?: ReactNode;
  className?: string;
}

/**
 * Resumen de una cita: servicio, fecha, hora, barbero, total e información de la barbería
 * (docs/11, paso "Confirmar" y pantalla "Listo"). Sin estado: sirve en Server Components.
 */
export function AppointmentSummary({
  serviceName,
  start,
  end,
  barberName,
  priceLabel,
  location,
  footer,
  className,
}: AppointmentSummaryProps) {
  const t = useTranslations("booking.summary");
  const f = useFormat();
  return (
    <section
      aria-label={t("label")}
      className={cn("grid gap-4 rounded-card border border-border bg-surface p-4", className)}
    >
      <div className="grid gap-1">
        <h2 className="text-heading">{serviceName}</h2>
        <p className="text-body first-letter:uppercase">{f.dateLong(start)}</p>
        <p className="text-body tabular-nums">{f.timeRange(start, end)}</p>
        <p className="text-body text-fg-muted">
          {barberName ? t("with", { name: barberName }) : t("anyBarber")}
        </p>
      </div>
      <dl className="grid gap-2 border-t border-border pt-4">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-body text-fg-muted">{t("total")}</dt>
          <dd className="text-label tabular-nums">{priceLabel}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-body text-fg-muted">{t("where")}</dt>
          <dd className="text-right text-body">{location}</dd>
        </div>
      </dl>
      {footer}
    </section>
  );
}
