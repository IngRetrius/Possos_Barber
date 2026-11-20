import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { toHourMinute } from "@possos/barbers";
import { getWorkingHours } from "@possos/barbers/server";
import { WeeklyHoursEditor } from "@possos/barbers/ui";
import { loadPanel } from "../../../../lib/panel";
import { saveHoursAction } from "../_actions/schedule";
import { BarberSwitcher } from "../_components/barber-switcher";
import { PanelHeader } from "../_components/panel-header";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("web.staff.admin.meta"))("hours") };
}

/** Horario semanal del barbero, con varios rangos por día. */
export default async function HoursPage() {
  const ctx = await loadPanel("/panel/horario");
  const barber = ctx.barber;
  const hours = barber ? await getWorkingHours(ctx.db, barber.id) : null;
  const t = await getTranslations("web.staff.admin");

  return (
    <>
      <PanelHeader title={t("hours.title")} backHref="/panel/mas" />
      {barber && ctx.viewer.isAdmin && (ctx.barbers.length > 1 || !ctx.viewer.barberId) ? (
        <div className="pb-4">
          <BarberSwitcher
            value={barber.id}
            barbers={ctx.barbers.map((b) => ({ id: b.id, name: b.display_name, active: b.active }))}
          />
        </div>
      ) : null}
      {!barber ? (
        <p className="px-gutter text-body text-fg-muted">{t("noBarbers")}</p>
      ) : !hours?.ok ? (
        <p role="alert" className="px-gutter text-body text-danger">
          {t("hours.loadError")}
        </p>
      ) : (
        <>
          <p className="px-gutter pb-2 text-body text-fg-muted">{t("hours.intro")}</p>
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
