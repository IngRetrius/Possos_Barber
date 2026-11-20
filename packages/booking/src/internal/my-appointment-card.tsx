import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button, StatusBadge, useFormat } from "@possos/ui";
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

/**
 * "Volver a reservar": el horario con el servicio, los adicionales y el barbero de la cita (si
 * siguen activos; un adicional que ya no existe se descarta en el flujo).
 */
export function rebookHref(appointment: MyAppointment): string | null {
  if (!appointment.serviceActive) return null;
  return selectionHref(BOOKING_ROUTES.time, {
    serviceId: appointment.serviceId,
    addonIds: appointment.addonIds,
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
  const t = useTranslations("booking");
  const f = useFormat();
  const now = new Date(nowIso);
  const upcoming = isUpcoming(appointment, now);
  const status = myStatusDisplay(appointment, now, f.locale);
  const deadline = appointment.changeDeadline;

  let actions: ReactNode = null;
  if (upcoming && canChange(appointment, now)) {
    const reschedule = canReschedule(appointment, now);
    actions = (
      <>
        {/* "Puedes cancelarla o cambiarla hasta el vie 20 nov a las 7:00 a. m.": sin punto final,
            la hora ya termina en "m.". */}
        <p className="text-body text-fg-muted">
          {t("card.deadline", { date: f.date(deadline), at: atTime(deadline, f.locale) })}
        </p>
        <div className={reschedule ? "grid grid-cols-2 gap-2" : "grid"}>
          {reschedule ? (
            <Button asChild variant="secondary">
              <Link href={MY_APPOINTMENTS_ROUTES.reschedule(appointment.id)}>
                {t("card.reschedule")}
              </Link>
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
        <p className="text-body text-fg-muted">
          {bookingErrorMessage("TOO_LATE_TO_CANCEL", f.locale)}
        </p>
        <Button asChild variant="secondary">
          <a href={appointment.barberWhatsappUrl} rel="noopener noreferrer">
            {t("card.writeBarber")}
          </a>
        </Button>
      </>
    ) : (
      <>
        <p className="text-body text-fg-muted">{t("card.tooLate")}</p>
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
        <Link href={href}>{t("card.rebook")}</Link>
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
            <p className="text-body text-warning">{t("card.approval")}</p>
          ) : null}
          {actions}
          {upcoming ? (
            <Button asChild variant="ghost">
              <a href={MY_APPOINTMENTS_ROUTES.calendar(appointment.id)}>{t("card.calendar")}</a>
            </Button>
          ) : null}
        </div>
      }
    />
  );
}
