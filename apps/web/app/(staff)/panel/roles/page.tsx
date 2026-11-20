import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { listStaff } from "@possos/auth/server";
import { loadAdminPanel } from "../../../../lib/panel";
import { PanelHeader } from "../_components/panel-header";
import { GrantRoleForm, RevokeRoleButton } from "../_components/settings-forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("web.staff.admin.meta"))("roles") };
}

/**
 * Roles (administrador, docs/06): quién es barbero o administrador. Tocar un rol lo quita;
 * la base impide quitarse a sí mismo el de administrador, así que siempre queda uno.
 */
export default async function RolesPage() {
  const { db, barbers, viewer } = await loadAdminPanel("/panel/roles");
  const staff = await listStaff(db);
  const t = await getTranslations("web.staff.admin.roles");
  const byUser = new Map(barbers.filter((b) => b.user_id).map((b) => [b.user_id!, b]));
  const free = barbers.filter((b) => !b.user_id).map((b) => ({ id: b.id, name: b.display_name }));

  return (
    <>
      <PanelHeader title={t("title")} backHref="/panel/mas" />
      <main className="grid content-start gap-8 px-gutter pb-8">
        <section className="grid gap-3" aria-labelledby="personal">
          <h2 id="personal" className="text-heading">
            {t("staff")}
          </h2>
          <p className="text-body text-fg-muted">{t("hint")}</p>
          {!staff.ok ? (
            <p role="alert" className="text-body text-danger">
              {t("loadError")}
            </p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
              {staff.data.map((m) => (
                <li key={m.userId} className="grid gap-1 px-4 py-3">
                  <span className="truncate text-label">
                    {m.email}
                    {m.userId === viewer.userId ? t("you") : ""}
                  </span>
                  {byUser.get(m.userId) ? (
                    <span className="text-caption text-fg-muted">
                      {t("profile", { name: byUser.get(m.userId)!.display_name })}
                    </span>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {m.roles.map((role) => (
                      <RevokeRoleButton key={role} userId={m.userId} role={role} email={m.email} />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="grid gap-3" aria-labelledby="dar">
          <h2 id="dar" className="text-heading">
            {t("grant")}
          </h2>
          <GrantRoleForm profiles={free} />
        </section>
      </main>
    </>
  );
}
