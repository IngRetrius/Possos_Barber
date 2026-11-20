import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getBookingSettings } from "@possos/booking/server";
import { offsetToHours } from "@possos/notifications";
import { getNotificationSettings } from "@possos/notifications/server";
import { loadAdminPanel } from "../../../../lib/panel";
import { PanelHeader } from "../_components/panel-header";
import { BookingSettingsForm, ReminderSettingsForm } from "../_components/settings-forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("web.staff.admin.meta"))("settings") };
}

/** Reglas de la agenda (booking_settings) y de los recordatorios (notification_settings). */
export default async function SettingsPage() {
  const { db } = await loadAdminPanel("/panel/configuracion");
  const t = await getTranslations("web.staff.admin.settings");
  const [booking, reminders] = await Promise.all([
    getBookingSettings(db),
    getNotificationSettings(db),
  ]);
  return (
    <>
      <PanelHeader title={t("title")} backHref="/panel/mas" />
      <main className="grid content-start gap-8 px-gutter pb-8">
        <section className="grid gap-3" aria-labelledby="agenda">
          <h2 id="agenda" className="text-heading">
            {t("schedule")}
          </h2>
          {booking.ok ? (
            <BookingSettingsForm initial={booking.data} />
          ) : (
            <p role="alert" className="text-body text-danger">
              {t("loadError")}
            </p>
          )}
        </section>
        <section className="grid gap-3" aria-labelledby="recordatorios">
          <h2 id="recordatorios" className="text-heading">
            {t("reminders")}
          </h2>
          <p className="text-body text-fg-muted">{t("remindersIntro")}</p>
          {reminders.ok ? (
            <ReminderSettingsForm
              first={offsetToHours(reminders.data.reminder_offsets_min[0])}
              second={offsetToHours(reminders.data.reminder_offsets_min[1])}
              sendConfirmation={reminders.data.send_confirmation}
            />
          ) : (
            <p role="alert" className="text-body text-danger">
              {t("remindersLoadError")}
            </p>
          )}
        </section>
      </main>
    </>
  );
}
