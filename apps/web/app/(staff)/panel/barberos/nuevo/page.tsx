import type { Metadata } from "next";
import { loadAdminPanel } from "../../../../../lib/panel";
import { NewBarberForm } from "../../_components/new-barber-form";
import { PanelHeader } from "../../_components/panel-header";

export const metadata: Metadata = { title: "Nuevo barbero · Panel · Possos Barber" };

export default async function NewBarberPage() {
  await loadAdminPanel("/panel/barberos/nuevo");
  return (
    <>
      <PanelHeader title="Nuevo barbero" backHref="/panel/barberos" />
      <NewBarberForm />
    </>
  );
}
