import type { Metadata } from "next";
import { Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { servicePriceLabel } from "@possos/catalog";
import { getService, listAddons } from "@possos/catalog/server";
import { Button, formatDuration, List, ListRow } from "@possos/ui";
import { currentLocale } from "../../../../../../lib/i18n";
import { loadAdminPanel } from "../../../../../../lib/panel";
import { PanelHeader } from "../../../_components/panel-header";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("web.staff.admin.meta"))("addons") };
}

/**
 * Adicionales de un servicio (administrador): barba, cejas, diseño. Cada uno suma su precio y sus
 * minutos a la cita y se pueden combinar todos (decisión del 20/11/2026).
 */
export default async function AddonsPage({
  params,
}: PageProps<"/panel/servicios/[id]/adicionales">) {
  const { id } = await params;
  const { db } = await loadAdminPanel(`/panel/servicios/${id}/adicionales`);
  const [service, addons] = await Promise.all([getService(db, id), listAddons(db, id)]);
  if (!service.ok || !service.data) notFound();
  const t = await getTranslations("web.staff.admin");
  const locale = await currentLocale();
  const list = addons.ok ? addons.data : [];

  return (
    <>
      <PanelHeader title={t("services.addons")} backHref={`/panel/servicios/${id}`}>
        <Button asChild variant="secondary" className="shrink-0 px-4">
          <Link href={`/panel/servicios/${id}/adicionales/nuevo`}>
            <Plus aria-hidden="true" strokeWidth={1.5} />
            {t("new")}
          </Link>
        </Button>
      </PanelHeader>
      <main className="grid content-start gap-4 px-gutter pt-2 pb-8">
        <p className="text-body text-fg-muted">
          {t("services.addonsIntro", { name: service.data.name })}
        </p>
        {!addons.ok ? (
          <p role="alert" className="text-body text-danger">
            {t("services.loadError")}
          </p>
        ) : list.length === 0 ? (
          <p className="text-body text-fg-muted">{t("services.addonsNone")}</p>
        ) : (
          <List>
            {list.map((addon) => (
              <ListRow
                key={addon.id}
                href={`/panel/servicios/${id}/adicionales/${addon.id}`}
                title={addon.name}
                detail={
                  t("services.addonDetail", {
                    price: `+${servicePriceLabel(addon.price_cop, locale)}`,
                    minutes:
                      addon.duration_min > 0
                        ? t("services.addonExtraTime", {
                            duration: formatDuration(addon.duration_min),
                          })
                        : t("services.addonSameTime"),
                  }) + (addon.active ? "" : t("services.inactive"))
                }
              />
            ))}
          </List>
        )}
      </main>
    </>
  );
}
