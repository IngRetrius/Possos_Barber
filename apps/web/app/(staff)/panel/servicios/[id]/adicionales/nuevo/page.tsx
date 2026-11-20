import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getService } from "@possos/catalog/server";
import { AddonForm } from "@possos/catalog/ui";
import { loadAdminPanel } from "../../../../../../../lib/panel";
import { createAddonAction } from "../../../../_actions/admin";
import { PanelHeader } from "../../../../_components/panel-header";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("web.staff.admin.meta"))("addons") };
}

export default async function NewAddonPage({
  params,
}: PageProps<"/panel/servicios/[id]/adicionales/nuevo">) {
  const { id } = await params;
  const { db } = await loadAdminPanel(`/panel/servicios/${id}/adicionales/nuevo`);
  const service = await getService(db, id);
  if (!service.ok || !service.data) notFound();
  const t = await getTranslations("web.staff.admin.services");
  return (
    <>
      <PanelHeader title={t("newAddon")} backHref={`/panel/servicios/${id}/adicionales`} />
      <AddonForm action={createAddonAction} serviceId={id} submitLabel={t("createAddon")} />
    </>
  );
}
