import type { Metadata } from "next";
import { listBarberServiceIds } from "@possos/barbers/server";
import { listActiveServices } from "@possos/catalog/server";
import { searchCustomers } from "@possos/customers/server";
import { toDateKey } from "@possos/ui";
import { loadPanel } from "../../../../../lib/panel";
import { bogotaHourMinute, parseDay, todayKey } from "../../../../../lib/panel-dates";
import { param } from "../../../../../lib/session";
import { NewAppointmentForm } from "../../_components/new-appointment-form";
import { PanelHeader } from "../../_components/panel-header";
import { freeStartsFor } from "../../_lib/free-starts";

export const metadata: Metadata = { title: "Nueva cita · Panel · Possos Barber" };

/**
 * "Nueva cita" (docs/11): página completa porque tiene búsqueda y formulario. Desde una hora
 * libre de "Hoy" llega con `?hora=<ISO>`; cambiar la fecha llega con `?fecha=`.
 */
export default async function NewAppointmentPage({ searchParams }: PageProps<"/panel/cita/nueva">) {
  const params = await searchParams;
  const ctx = await loadPanel("/panel/cita/nueva");
  const barber = ctx.barber;
  const hora = param(params.hora);
  const fromHour = hora && !Number.isNaN(new Date(hora).getTime()) ? hora : null;
  const date = parseDay(param(params.fecha)) ?? (fromHour ? toDateKey(fromHour) : todayKey());

  if (!barber) {
    return (
      <>
        <PanelHeader title="Nueva cita" backHref="/panel" />
        <p className="px-gutter text-body text-fg-muted">Primero crea un barbero en Más.</p>
      </>
    );
  }

  const [serviceIds, services, recent, free] = await Promise.all([
    listBarberServiceIds(ctx.db, barber.id),
    listActiveServices(ctx.db),
    searchCustomers(ctx.db, { query: "" }),
    freeStartsFor(ctx.db, barber, date),
  ]);
  const offered =
    services.ok && serviceIds.ok ? services.data.filter((s) => serviceIds.data.includes(s.id)) : [];

  return (
    <>
      <PanelHeader title="Nueva cita" backHref={`/panel?dia=${date}`} />
      {ctx.barbers.length > 1 ? (
        <p className="px-gutter pb-2 text-body text-fg-muted">Con {barber.display_name}</p>
      ) : null}
      <NewAppointmentForm
        barberId={barber.id}
        services={offered.map(({ id, name, duration_min }) => ({ id, name, duration_min }))}
        recent={recent.ok ? recent.data : []}
        date={date}
        time={fromHour && toDateKey(fromHour) === date ? bogotaHourMinute(fromHour) : ""}
        freeStarts={free}
        policyHref="/politica-de-datos"
      />
    </>
  );
}
