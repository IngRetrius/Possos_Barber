import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listActiveBarbers } from "@possos/barbers/server";
import { BOOKING_ROUTES, MY_APPOINTMENTS_ROUTES, parsePeriod } from "@possos/booking";
import { getAppointment } from "@possos/booking/server";
import { AppointmentSummary } from "@possos/booking/ui";
import { servicePriceLabel } from "@possos/catalog";
import { listActiveServices } from "@possos/catalog/server";
import { createClient } from "@possos/supabase/server";
import { Button, Logo } from "@possos/ui";
import { addressLabel, WHATSAPP_REMINDERS_ENABLED } from "../../../../lib/business";
import { param, requireCustomer } from "../../../../lib/session";
import { InstallHint } from "../../../_components/install-hint";

export const metadata: Metadata = { title: "Tu cita quedó reservada · Possos Barber" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** "Listo": la cita creada, "Agregar al calendario" y la invitación a instalar la app. */
export default async function DonePage({ searchParams }: PageProps<"/reservar/listo">) {
  const id = param((await searchParams).cita);
  if (!id || !UUID.test(id)) notFound();

  const db = await createClient();
  const { profile } = await requireCustomer(db, `${BOOKING_ROUTES.done}?cita=${id}`);
  const [appointment, services, barbers] = await Promise.all([
    getAppointment(db, id),
    listActiveServices(db),
    listActiveBarbers(db),
  ]);
  if (!appointment.ok || !appointment.data || appointment.data.customer_id !== profile.id) {
    notFound();
  }
  const period = parsePeriod(appointment.data.period);
  if (!period) notFound();

  const appt = appointment.data;
  const service = services.ok ? services.data.find((s) => s.id === appt.service_id) : undefined;
  const barber = barbers.ok ? barbers.data.find((b) => b.id === appt.barber_id) : undefined;
  const pending = appt.status === "pending_approval";

  return (
    <>
      <header className="flex min-h-14 items-center px-gutter pt-safe">
        <Link href="/" className="inline-flex min-h-12 min-w-12 items-center">
          <Logo label="Possos Barber, ir al inicio" />
        </Link>
      </header>
      <main className="grid flex-1 content-start gap-6 px-gutter pt-2 pb-8">
        <div className="grid gap-2">
          <h1 className="text-title">
            {pending ? "Tu reserva quedó pendiente" : "Tu cita quedó reservada"}
          </h1>
          {pending ? (
            <p className="text-body text-warning">
              Tu reserva queda pendiente de que el barbero la apruebe
            </p>
          ) : null}
          {WHATSAPP_REMINDERS_ENABLED && profile.whatsapp_opt_in && !pending ? (
            <p className="text-body text-fg-muted">
              Te llega un WhatsApp para confirmar un día antes.
            </p>
          ) : null}
        </div>
        <AppointmentSummary
          serviceName={service?.name ?? "Tu servicio"}
          start={period.start}
          end={period.end}
          barberName={barber?.display_name ?? null}
          priceLabel={servicePriceLabel(appt.price_cop)}
          location={addressLabel()}
        />
        <p className="text-body text-fg-muted">
          Puedes cancelar o cambiar tu cita hasta 2 horas antes.
        </p>
        <div className="grid gap-3">
          <Button asChild variant="secondary">
            <a href={MY_APPOINTMENTS_ROUTES.calendar(id)}>Agregar al calendario</a>
          </Button>
          <InstallHint />
          <Button asChild variant="ghost">
            <Link href="/">Volver al inicio</Link>
          </Button>
        </div>
      </main>
    </>
  );
}
