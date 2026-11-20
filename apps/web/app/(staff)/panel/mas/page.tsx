import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SignOutButton } from "@possos/auth/ui";
import { WHATSAPP_PRICE_COP, whatsappCostEstimate } from "@possos/notifications";
import { getWhatsappUsage } from "@possos/notifications/server";
import { List, ListRow } from "@possos/ui";
import { signOutAction } from "../../../(auth)/actions";
import { currentFormatters } from "../../../../lib/i18n";
import { loadPanel } from "../../../../lib/panel";
import { bogotaMonthRange, todayKey } from "../../../../lib/panel-dates";
import { whatsappRemindersEnabled } from "../../../../lib/whatsapp";
import { LocaleSwitch } from "../../../_components/locale-switch";
import { PushSettings } from "../_components/push-settings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("web.staff.meta"))("more") };
}

/**
 * "Más" (docs/11): lo que no se usa todos los días. Lo del administrador solo lo ve él.
 * "Avisos" (F8) va primero y solo para quien es barbero: es lo único que se hace una vez por
 * celular y el dueño lo busca al instalar la app. "WhatsApp" (F7, solo el administrador) muestra
 * el costo estimado del mes, calculado con el registro de mensajes (riesgo 3 de docs/10).
 */
export default async function MorePage() {
  const ctx = await loadPanel("/panel/mas");
  const { viewer } = ctx;
  const t = await getTranslations("web.staff.more");
  const f = await currentFormatters();
  const range = bogotaMonthRange(todayKey());
  const usage = viewer.isAdmin ? await getWhatsappUsage(ctx.db, range) : null;
  const roles = [viewer.isAdmin ? t("admin") : null, viewer.barberId ? t("barber") : null]
    .filter(Boolean)
    .join(t("and"));

  return (
    <main className="grid content-start gap-6 px-gutter pt-safe pb-6">
      <header className="grid gap-1 pt-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-title">{t("title")}</h1>
          <LocaleSwitch />
        </div>
        <p className="text-body text-fg-muted">
          {roles.charAt(0).toUpperCase() + roles.slice(1)}
          {viewer.email ? ` · ${viewer.email}` : ""}
        </p>
      </header>

      {viewer.barberId ? (
        <section className="grid gap-3" aria-labelledby="avisos">
          <h2 id="avisos" className="text-heading">
            {t("notifications")}
          </h2>
          <PushSettings publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null} />
        </section>
      ) : null}

      <section className="grid gap-3">
        <h2 className="text-heading">{t("charges")}</h2>
        <List>
          <ListRow
            title={t("settlement")}
            detail={t("settlementDetail")}
            href="/panel/liquidacion"
          />
        </List>
      </section>

      <section className="grid gap-3">
        <h2 className="text-heading">{t("schedule")}</h2>
        <List>
          <ListRow title={t("weeklyHours")} detail={t("weeklyHoursDetail")} href="/panel/horario" />
          <ListRow title={t("timeOff")} detail={t("timeOffDetail")} href="/panel/bloqueos" />
        </List>
      </section>

      {usage ? (
        <section className="grid gap-3" aria-labelledby="whatsapp">
          <h2 id="whatsapp" className="text-heading">
            {t("whatsapp")}
          </h2>
          <div className="grid gap-1.5 rounded-card border border-border bg-surface p-4">
            {usage.ok ? (
              <>
                <p className="text-label tabular-nums">
                  {t("whatsappMonth", {
                    month: f.monthYear(range.from).replace(/^./, (c) => c.toUpperCase()),
                    cost: f.price(whatsappCostEstimate(usage.data)),
                  })}
                </p>
                <p className="text-body text-fg-muted tabular-nums">
                  {t("whatsappCount", { delivered: usage.data.delivered })}
                  {usage.data.failed > 0
                    ? ` · ${t("whatsappFailed", { count: usage.data.failed })}`
                    : ""}
                </p>
                {usage.data.marketing > 0 ? (
                  <p className="text-caption text-warning">
                    {t("whatsappMarketing", { count: usage.data.marketing })}
                  </p>
                ) : null}
                <p className="text-caption text-fg-muted">
                  {whatsappRemindersEnabled()
                    ? t("whatsappRate", { price: f.price(WHATSAPP_PRICE_COP.utility) })
                    : t("whatsappOff")}
                </p>
              </>
            ) : (
              <p role="alert" className="text-body text-danger">
                {t("whatsappLoadError")}
              </p>
            )}
          </div>
        </section>
      ) : null}

      {viewer.isAdmin ? (
        <section className="grid gap-3">
          <h2 className="text-heading">{t("administration")}</h2>
          <List>
            <ListRow title={t("services")} detail={t("servicesDetail")} href="/panel/servicios" />
            <ListRow title={t("barbers")} detail={t("barbersDetail")} href="/panel/barberos" />
            <ListRow title={t("rates")} detail={t("ratesDetail")} href="/panel/porcentajes" />
            <ListRow
              title={t("settings")}
              detail={t("settingsDetail")}
              href="/panel/configuracion"
            />
            <ListRow title={t("roles")} detail={t("rolesDetail")} href="/panel/roles" />
          </List>
        </section>
      ) : null}

      <SignOutButton action={signOutAction} />
    </main>
  );
}
