import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SignOutButton } from "@possos/auth/ui";
import { List, ListRow } from "@possos/ui";
import { signOutAction } from "../../../(auth)/actions";
import { loadPanel } from "../../../../lib/panel";
import { LocaleSwitch } from "../../../_components/locale-switch";
import { PushSettings } from "../_components/push-settings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("web.staff.meta"))("more") };
}

/**
 * "Más" (docs/11): lo que no se usa todos los días. Lo del administrador solo lo ve él.
 * "Avisos" (F8) va primero y solo para quien es barbero: es lo único que se hace una vez por
 * celular y el dueño lo busca al instalar la app.
 */
export default async function MorePage() {
  const ctx = await loadPanel("/panel/mas");
  const { viewer } = ctx;
  const t = await getTranslations("web.staff.more");
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
