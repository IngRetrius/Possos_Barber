import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { loadAdminPanel } from "../../../../../lib/panel";
import { NewBarberForm } from "../../_components/new-barber-form";
import { PanelHeader } from "../../_components/panel-header";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("web.staff.admin.meta"))("newBarber") };
}

export default async function NewBarberPage() {
  const t = await getTranslations("web.staff.admin.barbers");
  await loadAdminPanel("/panel/barberos/nuevo");
  return (
    <>
      <PanelHeader title={t("newTitle")} backHref="/panel/barberos" />
      <NewBarberForm />
    </>
  );
}
