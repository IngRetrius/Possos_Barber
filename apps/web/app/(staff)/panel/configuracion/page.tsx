import type { Metadata } from "next";
import { getBookingSettings } from "@possos/booking/server";
import { offsetToHours } from "@possos/notifications";
import { getNotificationSettings } from "@possos/notifications/server";
import { loadAdminPanel } from "../../../../lib/panel";
import { PanelHeader } from "../_components/panel-header";
import { BookingSettingsForm, ReminderSettingsForm } from "../_components/settings-forms";

export const metadata: Metadata = { title: "Configuración · Panel · Possos Barber" };

/** Reglas de la agenda (booking_settings) y de los recordatorios (notification_settings). */
export default async function SettingsPage() {
  const { db } = await loadAdminPanel("/panel/configuracion");
  const [booking, reminders] = await Promise.all([
    getBookingSettings(db),
    getNotificationSettings(db),
  ]);
  return (
    <>
      <PanelHeader title="Configuración" backHref="/panel/mas" />
      <main className="grid content-start gap-8 px-gutter pb-8">
        <section className="grid gap-3" aria-labelledby="agenda">
          <h2 id="agenda" className="text-heading">
            Agenda
          </h2>
          {booking.ok ? (
            <BookingSettingsForm initial={booking.data} />
          ) : (
            <p role="alert" className="text-body text-danger">
              No pudimos cargar la configuración. Revisa tu conexión e intenta de nuevo
            </p>
          )}
        </section>
        <section className="grid gap-3" aria-labelledby="recordatorios">
          <h2 id="recordatorios" className="text-heading">
            Recordatorios
          </h2>
          <p className="text-body text-fg-muted">
            Los recordatorios por WhatsApp empiezan a salir cuando se active la conexión con Meta.
            Mientras tanto, esto solo queda guardado.
          </p>
          {reminders.ok ? (
            <ReminderSettingsForm
              first={offsetToHours(reminders.data.reminder_offsets_min[0])}
              second={offsetToHours(reminders.data.reminder_offsets_min[1])}
              sendConfirmation={reminders.data.send_confirmation}
            />
          ) : (
            <p role="alert" className="text-body text-danger">
              No pudimos cargar los recordatorios. Revisa tu conexión e intenta de nuevo
            </p>
          )}
        </section>
      </main>
    </>
  );
}
