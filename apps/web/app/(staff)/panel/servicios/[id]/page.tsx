import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { getService } from "@possos/catalog/server";
import { ServiceForm } from "@possos/catalog/ui";
import { loadAdminPanel } from "../../../../../lib/panel";
import { updateServiceAction } from "../../_actions/admin";
import { PanelHeader } from "../../_components/panel-header";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("web.staff.admin.meta"))("service") };
}

export default async function EditServicePage({ params }: PageProps<"/panel/servicios/[id]">) {
  const { id } = await params;
  const { db } = await loadAdminPanel(`/panel/servicios/${id}`);
  const result = await getService(db, id);
  const t = await getTranslations("web.staff.admin.services");
  if (!result.ok || !result.data) notFound();
  return (
    <>
      <PanelHeader title={result.data.name} backHref="/panel/servicios" />
      <ServiceForm action={updateServiceAction} initial={result.data} submitLabel={t("save")} />
    </>
  );
}
