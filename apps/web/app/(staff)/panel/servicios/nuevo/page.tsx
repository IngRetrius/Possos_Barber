import type { Metadata } from "next";
import { ServiceForm } from "@possos/catalog/ui";
import { loadAdminPanel } from "../../../../../lib/panel";
import { createServiceAction } from "../../_actions/admin";
import { PanelHeader } from "../../_components/panel-header";

export const metadata: Metadata = { title: "Nuevo servicio · Panel · Possos Barber" };

export default async function NewServicePage() {
  await loadAdminPanel("/panel/servicios/nuevo");
  return (
    <>
      <PanelHeader title="Nuevo servicio" backHref="/panel/servicios" />
      <ServiceForm action={createServiceAction} submitLabel="Crear servicio" />
    </>
  );
}
