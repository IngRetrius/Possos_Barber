import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { MY_APPOINTMENTS_ROUTES } from "@possos/booking";
import { MyAppointmentCard } from "@possos/booking/ui";
import { createClient } from "@possos/supabase/server";
import { Button } from "@possos/ui";
import { KeepOffline } from "../../../_components/keep-offline";
import { LocaleSwitch } from "../../../_components/locale-switch";
import { currentLocale } from "../../../../lib/i18n";
import { param } from "../../../../lib/session";
import { cancelMyAppointmentAction } from "../actions";
import { cardContext, loadMyAppointment } from "../_components/my-appointments";
import { NoticeToast } from "../_components/notice-toast";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("web.customer.meta"))("appointment") };
}

/**
 * Una cita del cliente: el destino de los botones de WhatsApp (F7) y de "También tienes". Sin
 * sesión pide ingresar y vuelve; con otra cuenta, 404.
 */
export default async function MyAppointmentPage({
  params,
  searchParams,
}: PageProps<"/mis-citas/[id]">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const db = await createClient();
  const appointment = await loadMyAppointment(db, id, MY_APPOINTMENTS_ROUTES.detail);
  const t = await getTranslations("web.customer");
  const locale = await currentLocale();
  const aviso = param(query.aviso);
  const notice = aviso === "cambiada" ? t("appointment.changed") : undefined;

  return (
    <>
      <header className="flex min-h-14 items-center gap-1 px-2 pt-safe">
        <Button asChild variant="ghost" size="icon">
          <Link href={MY_APPOINTMENTS_ROUTES.list} aria-label={t("appointment.back")}>
            <ArrowLeft strokeWidth={1.5} aria-hidden="true" />
          </Link>
        </Button>
        <p className="min-w-0 flex-1 text-label text-fg-muted">{t("appointment.back")}</p>
        <LocaleSwitch />
      </header>
      <main className="grid flex-1 content-start gap-6 px-gutter pt-2 pb-10 md:mx-auto md:w-full md:max-w-2xl">
        <h1 className="text-title">{t("appointment.title")}</h1>
        <MyAppointmentCard
          appointment={appointment}
          now={new Date().toISOString()}
          cancelAction={cancelMyAppointmentAction}
          {...cardContext(appointment, locale, t("myAppointments.instagram"))}
        />
      </main>
      {aviso && notice ? <NoticeToast id={aviso} message={notice} /> : null}
      <KeepOffline urls={[MY_APPOINTMENTS_ROUTES.detail(appointment.id)]} />
    </>
  );
}
