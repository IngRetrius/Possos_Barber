import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Button, List, ListRow } from "@possos/ui";
import { loadAdminPanel } from "../../../../lib/panel";
import { PanelHeader } from "../_components/panel-header";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("web.staff.admin.meta"))("barbers") };
}

/** Barberos (administrador): activos e inactivos. */
export default async function BarbersPage() {
  const { barbers } = await loadAdminPanel("/panel/barberos");
  const t = await getTranslations("web.staff.admin");
  return (
    <>
      <PanelHeader title={t("barbers.title")} backHref="/panel/mas">
        <Button asChild variant="secondary" className="shrink-0 px-4">
          <Link href="/panel/barberos/nuevo">
            <Plus aria-hidden="true" strokeWidth={1.5} />
            {t("new")}
          </Link>
        </Button>
      </PanelHeader>
      <main className="grid content-start gap-4 px-gutter pt-2 pb-8">
        {barbers.length === 0 ? (
          <p className="text-body text-fg-muted">{t("noBarbers")}</p>
        ) : (
          <List>
            {barbers.map((b) => (
              <ListRow
                key={b.id}
                title={b.display_name}
                detail={[
                  b.active ? t("barbers.active") : t("barbers.inactive"),
                  b.user_id ? t("barbers.withAccount") : t("barbers.withoutAccount"),
                ].join(" · ")}
                href={`/panel/barberos/${b.id}`}
              />
            ))}
          </List>
        )}
      </main>
    </>
  );
}
