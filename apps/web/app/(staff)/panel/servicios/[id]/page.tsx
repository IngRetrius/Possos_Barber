import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getService } from "@possos/catalog/server";
import { ServiceForm } from "@possos/catalog/ui";
import { loadAdminPanel } from "../../../../../lib/panel";
import { updateServiceAction } from "../../_actions/admin";
import { PanelHeader } from "../../_components/panel-header";

export const metadata: Metadata = { title: "Servicio · Panel · Possos Barber" };

export default async function EditServicePage({ params }: PageProps<"/panel/servicios/[id]">) {
  const { id } = await params;
  const { db } = await loadAdminPanel(`/panel/servicios/${id}`);
  const result = await getService(db, id);
  if (!result.ok || !result.data) notFound();
  return (
    <>
      <PanelHeader title={result.data.name} backHref="/panel/servicios" />
      <ServiceForm action={updateServiceAction} initial={result.data} submitLabel="Guardar" />
    </>
  );
}
