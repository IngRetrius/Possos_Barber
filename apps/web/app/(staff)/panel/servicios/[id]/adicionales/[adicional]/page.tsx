import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { listAddons } from "@possos/catalog/server";
import { AddonForm } from "@possos/catalog/ui";
import { loadAdminPanel } from "../../../../../../../lib/panel";
import { updateAddonAction } from "../../../../_actions/admin";
import { PanelHeader } from "../../../../_components/panel-header";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("web.staff.admin.meta"))("addons") };
}

export default async function EditAddonPage({
  params,
}: PageProps<"/panel/servicios/[id]/adicionales/[adicional]">) {
  const { id, adicional } = await params;
  const { db } = await loadAdminPanel(`/panel/servicios/${id}/adicionales/${adicional}`);
  const addons = await listAddons(db, id);
  const addon = addons.ok ? addons.data.find((a) => a.id === adicional) : undefined;
  if (!addon) notFound();
  const t = await getTranslations("web.staff.admin.services");
  return (
    <>
      <PanelHeader title={addon.name} backHref={`/panel/servicios/${id}/adicionales`} />
      <AddonForm
        action={updateAddonAction}
        serviceId={id}
        initial={addon}
        submitLabel={t("save")}
      />
    </>
  );
}
