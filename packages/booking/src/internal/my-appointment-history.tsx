import Link from "next/link";
import { Button, cn, formatDate, formatTime, StatusBadge } from "@possos/ui";
import { rebookHref } from "./my-appointment-card";
import { myStatusDisplay, type MyAppointment } from "./my-appointments";

export interface MyAppointmentHistoryProps {
  appointments: MyAppointment[];
  /** Hora del servidor (ISO). */
  now: string;
  className?: string;
}

/**
 * Citas pasadas, canceladas y rechazadas en una lista simple, cada una con su estado y "Volver a
 * reservar" (si el servicio sigue activo). No abre la cita: lo que importa es volver a reservar.
 */
export function MyAppointmentHistory({ appointments, now, className }: MyAppointmentHistoryProps) {
  const at = new Date(now);
  return (
    <ul
      className={cn(
        "divide-y divide-border overflow-hidden rounded-card border border-border bg-surface",
        className,
      )}
    >
      {appointments.map((appointment) => {
        const status = myStatusDisplay(appointment, at);
        const href = rebookHref(appointment);
        return (
          <li key={appointment.id} className="flex min-h-16 items-center gap-3 px-4 py-3">
            <div className="grid min-w-0 flex-1 gap-1">
              <p className="truncate text-label">{appointment.serviceName}</p>
              <p className="text-caption text-fg-muted tabular-nums">
                {formatDate(appointment.start)}, {formatTime(appointment.start)}
              </p>
              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            </div>
            {href ? (
              <Button asChild variant="secondary" className="shrink-0 px-4">
                <Link href={href} aria-label={`Volver a reservar ${appointment.serviceName}`}>
                  Volver a reservar
                </Link>
              </Button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
