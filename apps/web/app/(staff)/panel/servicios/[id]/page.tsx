import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { getService, listAddons } from "@possos/catalog/server";
import { ServiceForm } from "@possos/catalog/ui";
import { List, ListRow } from "@possos/ui";
import { loadAdminPanel } from "../../../../../lib/panel";
import { updateServiceAction } from "../../_actions/admin";
import { PanelHeader } from "../../_components/panel-header";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("web.staff.admin.meta"))("service") };
}

export default async function EditServicePage({ params }: PageProps<"/panel/servicios/[id]">) {
  const { id } = await params;
  const { db } = await loadAdminPanel(`/panel/servicios/${id}`);
  const [result, addons] = await Promise.all([getService(db, id), listAddons(db, id)]);
  const t = await getTranslations("web.staff.admin.services");
  if (!result.ok || !result.data) notFound();
  const activeAddons = addons.ok ? addons.data.filter((a) => a.active) : [];
  return (
    <>
      <PanelHeader title={result.data.name} backHref="/panel/servicios" />
      <ServiceForm
        action={updateServiceAction}
        initial={result.data}
        submitLabel={t("save")}
        extra={
          // Los adicionales se cambian en su propia pantalla (lista, nuevo, editar).
          <List>
            <ListRow
              href={`/panel/servicios/${id}/adicionales`}
              title={t("addons")}
              detail={
                activeAddons.length
                  ? activeAddons.map((a) => a.name).join(", ")
                  : t("addonsCount", { count: 0 })
              }
            />
          </List>
        }
      />
    </>
  );
}
