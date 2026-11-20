import { DEFAULT_LOCALE, type Locale } from "@possos/config/constants";

/*
 * Estado del flujo de reserva en la URL (`?servicio=…&barbero=…&fecha=…&hora=…`): el botón atrás
 * funciona y el regreso del registro no pierde nada. Sin efectos: lo usan el servidor y el
 * navegador. No importa ./index (lo reexporta), para que dependency-cruiser no vea un ciclo.
 */

/** Rutas del flujo. Viven en `apps/web/app/(customer)/reservar`. */
export const BOOKING_ROUTES = {
  service: "/reservar",
  barber: "/reservar/barbero",
  time: "/reservar/horario",
  confirm: "/reservar/confirmar",
  done: "/reservar/listo",
} as const;

/** Valor de `barbero` para "Cualquiera disponible". */
export const ANY_BARBER = "cualquiera";

export interface BookingSelection {
  serviceId: string | null;
  /** Id del barbero, `ANY_BARBER` o null si todavía no se elige. */
  barberId: string | null;
  /** Día del calendario en Bogotá, `YYYY-MM-DD`. */
  date: string | null;
  /** Inicio de la hora elegida, ISO 8601 en UTC (`toISOString`). */
  startAt: string | null;
}

export type BookingStep = "service" | "barber" | "time" | "confirm";

/** Nombre de cada paso en cada idioma (`BOOKING_STEP_NAMES[locale][step]`). */
export const BOOKING_STEP_NAMES: Record<Locale, Record<BookingStep, string>> = {
  es: { service: "Servicio", barber: "Barbero", time: "Horario", confirm: "Confirmar" },
  en: { service: "Service", barber: "Barber", time: "Time", confirm: "Confirm" },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

type ParamsInput = URLSearchParams | Record<string, string | string[] | undefined>;

function read(params: ParamsInput, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

/** Un instante en el formato con que se comparan las horas, o null si no es una fecha. */
export function normalizeInstant(value: string | null | undefined): string | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

function validDay(value: string | undefined): string | null {
  if (!value || !DAY.test(value)) return null;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value) ? value : null;
}

/** Lee lo elegido de la URL. Lo que no tiene forma válida queda en null. */
export function parseSelection(params: ParamsInput): BookingSelection {
  const service = read(params, "servicio");
  const barber = read(params, "barbero");
  return {
    serviceId: service && UUID.test(service) ? service.toLowerCase() : null,
    barberId:
      barber === ANY_BARBER
        ? ANY_BARBER
        : barber && UUID.test(barber)
          ? barber.toLowerCase()
          : null,
    date: validDay(read(params, "fecha")),
    startAt: normalizeInstant(read(params, "hora")),
  };
}

/** Ruta de un paso con lo elegido hasta ahora, en un orden fijo de parámetros. */
export function selectionHref(
  path: string,
  selection: Partial<BookingSelection>,
  extra?: Record<string, string>,
): string {
  const query = new URLSearchParams();
  if (selection.serviceId) query.set("servicio", selection.serviceId);
  if (selection.barberId) query.set("barbero", selection.barberId);
  if (selection.date) query.set("fecha", selection.date);
  if (selection.startAt) query.set("hora", selection.startAt);
  for (const [key, value] of Object.entries(extra ?? {})) query.set(key, value);
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}

/**
 * Pasos que el cliente va a recorrer: el de servicio solo con más de un servicio activo y el de
 * barbero solo con más de un barbero que haga el servicio (docs/11, decisión 3).
 */
export function bookingSteps(counts: { services: number; barbers: number }): BookingStep[] {
  const steps: BookingStep[] = [];
  if (counts.services > 1) steps.push("service");
  if (counts.barbers > 1) steps.push("barber");
  steps.push("time", "confirm");
  return steps;
}

/** "Paso n de m · Nombre" contando solo los pasos que se muestran. */
export function stepPosition(
  step: BookingStep,
  steps: BookingStep[],
  locale: Locale = DEFAULT_LOCALE,
): { step: number; total: number; name: string } {
  const index = steps.indexOf(step);
  return {
    step: index === -1 ? 1 : index + 1,
    total: steps.length,
    name: BOOKING_STEP_NAMES[locale][step],
  };
}

export interface DayAvailability {
  /** `YYYY-MM-DD` en Bogotá. */
  date: string;
  slots: number;
}

/**
 * Día que se muestra al entrar al horario: hoy, o el primer día con horas si hoy no tiene.
 * `skippedToday` dice que hubo que saltar (para el aviso "Hoy no hay horas...").
 */
export function pickInitialDay(
  days: DayAvailability[],
  today: string,
): { date: string; skippedToday: boolean } {
  const todayEntry = days.find((d) => d.date === today);
  if (todayEntry && todayEntry.slots > 0) return { date: today, skippedToday: false };
  const first = days.find((d) => d.slots > 0 && d.date > today);
  return first ? { date: first.date, skippedToday: true } : { date: today, skippedToday: false };
}

/** El siguiente día con horas después de `date`, o null. */
export function nextDayWithSlots(days: DayAvailability[], date: string): string | null {
  return days.find((d) => d.date > date && d.slots > 0)?.date ?? null;
}
