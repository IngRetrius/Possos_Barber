import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { listActiveBarbers } from "@possos/barbers/server";
import { BOOKING_ROUTES, MY_APPOINTMENTS_ROUTES, parsePeriod } from "@possos/booking";
import { getAppointment, getMyAppointment } from "@possos/booking/server";
import { AppointmentSummary } from "@possos/booking/ui";
import { servicePriceLabel } from "@possos/catalog";
import { listActiveServices } from "@possos/catalog/server";
import { createClient } from "@possos/supabase/server";
import { Button, Logo } from "@possos/ui";
import { addressLabel } from "../../../../lib/business";
import { whatsappRemindersEnabled } from "../../../../lib/whatsapp";
import { currentFormatters } from "../../../../lib/i18n";
import { param, requireCustomer } from "../../../../lib/session";
import { InstallHint } from "../../../_components/install-hint";
import { LocaleSwitch } from "../../../_components/locale-switch";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("web.customer.meta"))("done") };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** "Listo": la cita creada, "Agregar al calendario" y la invitación a instalar la app. */
export default async function DonePage({ searchParams }: PageProps<"/reservar/listo">) {
  const id = param((await searchParams).cita);
  if (!id || !UUID.test(id)) notFound();

  const db = await createClient();
  const { profile } = await requireCustomer(db, `${BOOKING_ROUTES.done}?cita=${id}`);
  const [appointment, mine, services, barbers] = await Promise.all([
    getAppointment(db, id),
    // El nombre con los adicionales ("Corte + Barba") sale de Mis citas.
    getMyAppointment(db, id),
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
  const t = await getTranslations("web.customer");
  const tc = await getTranslations("web.common");
  const f = await currentFormatters();

  return (
    <>
      <header className="flex min-h-14 items-center justify-between gap-2 px-gutter pt-safe">
        <Link href="/" className="inline-flex min-h-12 min-w-12 items-center">
          <Logo label={tc("header.home")} />
        </Link>
        <LocaleSwitch />
      </header>
      <main className="grid flex-1 content-start gap-6 px-gutter pt-2 pb-8">
        <div className="grid gap-2">
          <h1 className="text-title">{pending ? t("done.pendingTitle") : t("done.title")}</h1>
          {pending ? <p className="text-body text-warning">{t("approval")}</p> : null}
          {whatsappRemindersEnabled() && profile.whatsapp_opt_in && !pending ? (
            <p className="text-body text-fg-muted">{t("done.whatsapp")}</p>
          ) : null}
        </div>
        <AppointmentSummary
          serviceName={
            (mine.ok ? mine.data?.serviceName : null) ?? service?.name ?? t("done.fallbackService")
          }
          start={period.start}
          end={period.end}
          barberName={barber?.display_name ?? null}
          priceLabel={servicePriceLabel(appt.price_cop, f.locale)}
          location={addressLabel(f.locale)}
        />
        <p className="text-body text-fg-muted">{t("policy")}</p>
        <div className="grid gap-3">
          <Button asChild variant="secondary">
            <a href={MY_APPOINTMENTS_ROUTES.calendar(id)}>{t("done.calendar")}</a>
          </Button>
          <InstallHint />
          <Button asChild variant="ghost">
            <Link href="/">{t("backHome")}</Link>
          </Button>
        </div>
      </main>
    </>
  );
}
