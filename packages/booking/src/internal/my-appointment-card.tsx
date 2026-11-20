import Link from "next/link";
import type { ReactNode } from "react";
import { Button, formatDate, StatusBadge } from "@possos/ui";
import { bookingErrorMessage } from "./errors";
import { CancelAppointment, type CancelAppointmentAction } from "./cancel-appointment";
import {
  atTime,
  canChange,
  canReschedule,
  isUpcoming,
  MY_APPOINTMENTS_ROUTES,
  myStatusDisplay,
  type MyAppointment,
} from "./my-appointments";
import { BOOKING_ROUTES, selectionHref } from "./selection";
import { AppointmentSummary } from "./summary";

export interface MyAppointmentCardProps {
  appointment: MyAppointment;
  /** Hora del servidor (ISO). El render no lee el reloj. */
  now: string;
  /** "$ 30.000" o "[PENDIENTE]". */
  priceLabel: string;
  /** Dirección de la barbería o "[PENDIENTE]". */
  location: string;
  cancelAction: CancelAppointmentAction;
  /**
   * Contacto de la barbería cuando ya no se puede cambiar la cita y el barbero no tiene enlace de
   * WhatsApp (por ejemplo, el Instagram). Sin él, solo se dice que ya no se puede.
   */
  fallbackContact?: { label: string; href: string } | null;
  className?: string;
}

const APPROVAL = "Tu reserva queda pendiente de que el barbero la apruebe";

/**
 * "Puedes cancelarla o cambiarla hasta el vie 20 nov a las 7:00 a. m." Sin punto final: la hora
 * ya termina en "m.".
 */
function deadlineText(deadline: string): string {
  return `Puedes cancelarla o cambiarla hasta el ${formatDate(deadline)} ${atTime(deadline)}`;
}

/** "Volver a reservar": el horario con el servicio y el barbero de la cita (si siguen activos). */
export function rebookHref(appointment: MyAppointment): string | null {
  if (!appointment.serviceActive) return null;
  return selectionHref(BOOKING_ROUTES.time, {
    serviceId: appointment.serviceId,
    barberId: appointment.barberActive ? appointment.barberId : null,
  });
}

/**
 * Tarjeta de una cita del cliente (docs/11, "Mis citas"). Próxima: "Cambiar hora" y "Cancelar"
 * dentro del límite; pasado el límite, "Escríbele al barbero". Pasada: su estado y "Volver a
 * reservar". La base vuelve a decidir al cancelar o cambiar; aquí solo se esconden los botones.
 */
export function MyAppointmentCard({
  appointment,
  now: nowIso,
  priceLabel,
  location,
  cancelAction,
  fallbackContact,
  className,
}: MyAppointmentCardProps) {
  const now = new Date(nowIso);
  const upcoming = isUpcoming(appointment, now);
  const status = myStatusDisplay(appointment, now);
  const deadline = appointment.changeDeadline;

  let actions: ReactNode = null;
  if (upcoming && canChange(appointment, now)) {
    const reschedule = canReschedule(appointment, now);
    actions = (
      <>
        <p className="text-body text-fg-muted">{deadlineText(deadline)}</p>
        <div className={reschedule ? "grid grid-cols-2 gap-2" : "grid"}>
          {reschedule ? (
            <Button asChild variant="secondary">
              <Link href={MY_APPOINTMENTS_ROUTES.reschedule(appointment.id)}>Cambiar hora</Link>
            </Button>
          ) : null}
          <CancelAppointment
            appointmentId={appointment.id}
            start={appointment.start}
            action={cancelAction}
          />
        </div>
      </>
    );
  } else if (upcoming) {
    actions = appointment.barberWhatsappUrl ? (
      <>
        <p className="text-body text-fg-muted">{bookingErrorMessage("TOO_LATE_TO_CANCEL")}</p>
        <Button asChild variant="secondary">
          <a href={appointment.barberWhatsappUrl} rel="noopener noreferrer">
            Escríbele al barbero
          </a>
        </Button>
      </>
    ) : (
      <>
        <p className="text-body text-fg-muted">Ya no puedes cambiarla desde aquí.</p>
        {fallbackContact ? (
          <Button asChild variant="secondary">
            <a href={fallbackContact.href} rel="noopener noreferrer">
              {fallbackContact.label}
            </a>
          </Button>
        ) : null}
      </>
    );
  } else {
    const href = rebookHref(appointment);
    actions = href ? (
      <Button asChild variant="secondary">
        <Link href={href}>Volver a reservar</Link>
      </Button>
    ) : null;
  }

  return (
    <AppointmentSummary
      className={className}
      serviceName={appointment.serviceName}
      start={appointment.start}
      end={appointment.end}
      barberName={appointment.barberName}
      priceLabel={priceLabel}
      location={location}
      footer={
        <div className="grid gap-3 border-t border-border pt-4">
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          {upcoming && appointment.status === "pending_approval" ? (
            <p className="text-body text-warning">{APPROVAL}</p>
          ) : null}
          {actions}
          {upcoming ? (
            <Button asChild variant="ghost">
              <a
                href={MY_APPOINTMENTS_ROUTES.calendar(appointment.id)}
                download="cita-possos-barber.ics"
              >
                Agregar al calendario
              </a>
            </Button>
          ) : null}
        </div>
      }
    />
  );
}
