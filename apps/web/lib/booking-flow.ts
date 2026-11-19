import "server-only";
import type { Barber } from "@possos/barbers";
import { listBarbersForService } from "@possos/barbers/server";
import {
  ANY_BARBER,
  BOOKING_ROUTES,
  bookingSteps,
  selectionHref,
  type BookingSelection,
  type BookingStep,
} from "@possos/booking";
import type { Service } from "@possos/catalog";
import { listActiveServices } from "@possos/catalog/server";
import type { DbClient } from "@possos/supabase";

/*
 * Composición de catalog, barbers y booking para el flujo de reserva: qué servicio y qué barbero
 * valen, qué pasos se muestran y a qué paso volver. Vive en la app porque junta tres módulos
 * (docs/08); las reglas de la agenda siguen en Postgres.
 */

export interface BookingFlow {
  services: Service[];
  /** El servicio elegido (o el único activo), o null. */
  service: Service | null;
  /** Barberos activos que hacen el servicio. */
  barbers: Barber[];
  /** Id del barbero (el único, si hay uno), `ANY_BARBER`, o null si falta elegir. */
  barberId: string | null;
  steps: BookingStep[];
}

export async function loadBookingFlow(
  db: DbClient,
  selection: BookingSelection,
): Promise<BookingFlow> {
  const listed = await listActiveServices(db);
  if (!listed.ok) throw new Error(`No se pudieron leer los servicios: ${listed.error}`);
  const services = listed.data;
  const service =
    services.find((s) => s.id === selection.serviceId) ??
    (services.length === 1 ? services[0]! : null);

  let barbers: Barber[] = [];
  if (service) {
    const result = await listBarbersForService(db, service.id);
    if (!result.ok) throw new Error(`No se pudieron leer los barberos: ${result.error}`);
    barbers = result.data;
  }

  let barberId: string | null = null;
  if (barbers.length === 1) barberId = barbers[0]!.id;
  else if (selection.barberId === ANY_BARBER && barbers.length > 1) barberId = ANY_BARBER;
  else if (barbers.some((b) => b.id === selection.barberId)) barberId = selection.barberId;

  return {
    services,
    service,
    barbers,
    barberId,
    steps: bookingSteps({ services: services.length, barbers: barbers.length }),
  };
}

/** Lo elegido, corregido con lo que el flujo resolvió (servicio único, barbero único). */
export function resolvedSelection(
  flow: BookingFlow,
  selection: BookingSelection,
): BookingSelection {
  return { ...selection, serviceId: flow.service?.id ?? null, barberId: flow.barberId };
}

/**
 * Primer paso que le falta al cliente, o null si ya tiene servicio y barbero. Sirve para el
 * botón "Reservar" del inicio y para mandar atrás a quien llega con una URL incompleta.
 */
export function missingStepHref(flow: BookingFlow): string | null {
  if (!flow.service) return BOOKING_ROUTES.service;
  if (!flow.barberId) {
    return selectionHref(BOOKING_ROUTES.barber, { serviceId: flow.service.id });
  }
  return null;
}

/** El paso de horario con lo elegido: la entrada al flujo cuando ya hay servicio y barbero. */
export function timeStepHref(flow: BookingFlow, selection: BookingSelection): string {
  return (
    missingStepHref(flow) ??
    selectionHref(BOOKING_ROUTES.time, {
      serviceId: flow.service!.id,
      barberId: flow.barberId,
      date: selection.date,
    })
  );
}

/** Paso anterior a `step` (para el botón atrás del encabezado), o el inicio. */
export function previousStepHref(
  flow: BookingFlow,
  step: BookingStep,
  selection: BookingSelection,
): string {
  const index = flow.steps.indexOf(step);
  const previous = index > 0 ? flow.steps[index - 1] : undefined;
  const sel = resolvedSelection(flow, selection);
  switch (previous) {
    case "service":
      return BOOKING_ROUTES.service;
    case "barber":
      return selectionHref(BOOKING_ROUTES.barber, { serviceId: sel.serviceId });
    case "time":
      return selectionHref(BOOKING_ROUTES.time, sel);
    default:
      return "/";
  }
}

/** Nombre del barbero para el resumen, o null con "Cualquiera disponible". */
export function barberName(flow: BookingFlow, barberId: string | null): string | null {
  return flow.barbers.find((b) => b.id === barberId)?.display_name ?? null;
}
