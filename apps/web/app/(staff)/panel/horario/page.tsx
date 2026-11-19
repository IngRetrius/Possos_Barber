import type { Metadata } from "next";
import { toHourMinute } from "@possos/barbers";
import { getWorkingHours } from "@possos/barbers/server";
import { WeeklyHoursEditor } from "@possos/barbers/ui";
import { loadPanel } from "../../../../lib/panel";
import { saveHoursAction } from "../_actions/schedule";
import { BarberSwitcher } from "../_components/barber-switcher";
import { PanelHeader } from "../_components/panel-header";

export const metadata: Metadata = { title: "Horario · Panel · Possos Barber" };

/** Horario semanal del barbero, con varios rangos por día. */
export default async function HoursPage() {
  const ctx = await loadPanel("/panel/horario");
  const barber = ctx.barber;
  const hours = barber ? await getWorkingHours(ctx.db, barber.id) : null;

  return (
    <>
      <PanelHeader title="Horario semanal" backHref="/panel/mas" />
      {barber && ctx.viewer.isAdmin && (ctx.barbers.length > 1 || !ctx.viewer.barberId) ? (
        <div className="pb-4">
          <BarberSwitcher
            value={barber.id}
            barbers={ctx.barbers.map((b) => ({ id: b.id, name: b.display_name, active: b.active }))}
          />
        </div>
      ) : null}
      {!barber ? (
        <p className="px-gutter text-body text-fg-muted">Todavía no hay barberos.</p>
      ) : !hours?.ok ? (
        <p role="alert" className="px-gutter text-body text-danger">
          No pudimos cargar el horario. Revisa tu conexión e intenta de nuevo
        </p>
      ) : (
        <>
          <p className="px-gutter pb-2 text-body text-fg-muted">
            Las horas que ven los clientes salen de aquí. Para el almuerzo, usa dos rangos. Las
            citas que ya existen no cambian.
          </p>
          <WeeklyHoursEditor
            key={barber.id}
            action={saveHoursAction}
            barberId={barber.id}
            initial={hours.data.map((h) => ({
              weekday: h.weekday,
              start_time: toHourMinute(h.start_time),
              end_time: toHourMinute(h.end_time),
            }))}
          />
        </>
      )}
    </>
  );
}
