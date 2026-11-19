import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BOOKING_ROUTES, parseSelection, selectionHref, stepPosition } from "@possos/booking";
import { ServiceList } from "@possos/catalog/ui";
import { createClient } from "@possos/supabase/server";
import { Button, EmptyState, StepHeader } from "@possos/ui";
import { loadBookingFlow, timeStepHref } from "../../../lib/booking-flow";

export const metadata: Metadata = { title: "Reserva tu cita · Possos Barber" };

/**
 * Paso "Servicio". Solo se ve con más de un servicio activo: con uno, se elige solo y el flujo
 * sigue al barbero o al horario (docs/11, decisión 3). Tocar una fila avanza.
 */
export default async function ServiceStepPage({ searchParams }: PageProps<"/reservar">) {
  const selection = parseSelection(await searchParams);
  const db = await createClient();
  const flow = await loadBookingFlow(db, { ...selection, serviceId: null });

  if (flow.services.length === 1) redirect(timeStepHref(flow, selection));

  const position = stepPosition("service", flow.steps);
  return (
    <>
      <StepHeader {...position} backHref="/" backLabel="Volver al inicio" />
      <main className="grid flex-1 content-start gap-6 px-gutter pt-2 pb-8">
        <h1 className="text-title">¿Qué servicio quieres?</h1>
        {flow.services.length === 0 ? (
          <EmptyState
            title="Todavía no hay servicios para reservar"
            description="[PENDIENTE] Los servicios, con su duración y precio, los define el dueño."
            action={
              <Button asChild variant="secondary">
                <Link href="/">Volver al inicio</Link>
              </Button>
            }
          />
        ) : (
          <ServiceList
            services={flow.services}
            hrefFor={(service) => selectionHref(BOOKING_ROUTES.barber, { serviceId: service.id })}
          />
        )}
      </main>
    </>
  );
}
