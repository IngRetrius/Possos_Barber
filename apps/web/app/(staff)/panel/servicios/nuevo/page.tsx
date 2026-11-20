import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ServiceForm } from "@possos/catalog/ui";
import { loadAdminPanel } from "../../../../../lib/panel";
import { createServiceAction } from "../../_actions/admin";
import { PanelHeader } from "../../_components/panel-header";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("web.staff.admin.meta"))("newService") };
}

export default async function NewServicePage() {
  const t = await getTranslations("web.staff.admin.services");
  await loadAdminPanel("/panel/servicios/nuevo");
  return (
    <>
      <PanelHeader title={t("newTitle")} backHref="/panel/servicios" />
      <ServiceForm action={createServiceAction} submitLabel={t("create")} />
    </>
  );
}
