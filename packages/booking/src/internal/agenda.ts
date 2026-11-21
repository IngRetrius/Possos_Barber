/*
 * La agenda de un día en el panel (docs/11, "Hoy"): una lista por hora con citas, horas libres y
 * bloqueos. Función pura: recibe lo que el servidor leyó y no toca la base.
 *
 * Las horas son de Bogotá (UTC-5 fijo; Colombia no tiene horario de verano). No importa ./index
 * para que dependency-cruiser no vea un ciclo.
 */
import type { Enums } from "@possos/supabase";

type AppointmentStatus = Enums<"appointment_status">;

/** Una cita del panel, con lo que el barbero necesita ver. */
export interface AgendaAppointment {
  id: string;
  barberId: string;
  status: AppointmentStatus;
  start: string;
  end: string;
  priceCop: number | null;
  serviceId: string;
  /** El servicio con sus adicionales: "Corte + Barba + Cejas". */
  serviceName: string;
  /** Adicionales de la cita (para moverla con la misma duración). */
  addonIds: string[];
  customerId: string;
  customerName: string;
  /** E.164, o null si el cliente no lo dio. Solo lo ve el personal. */
  customerPhone: string | null;
  source: "customer" | "staff";
}

export interface AgendaBlock {
  id: string;
  start: string;
  end: string;
  reason: string | null;
}

export interface AgendaRange {
  /** `HH:MM` o `HH:MM:SS`, hora de Bogotá. */
  start_time: string;
  end_time: string;
}

export type AgendaItem =
  | { kind: "appointment"; start: string; end: string; appointment: AgendaAppointment }
  | { kind: "free"; start: string; end: string }
  | { kind: "blocked"; start: string; end: string; block: AgendaBlock; allDay: boolean };

const OFFSET = "-05:00";
const MINUTE = 60_000;

/** Instante ISO de un día `YYYY-MM-DD` a una hora `HH:MM` de Bogotá. */
export function bogotaInstant(day: string, time: string): string {
  return new Date(`${day}T${time.slice(0, 5)}:00${OFFSET}`).toISOString();
}

/** El día siguiente a `YYYY-MM-DD`. */
export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** ISO 1 lunes a 7 domingo. */
export function isoWeekday(day: string): number {
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

/** El lunes de la semana de `day`. */
export function weekStart(day: string): string {
  return addDays(day, 1 - isoWeekday(day));
}

/** `[inicio, fin)` del día en Bogotá, en ISO. */
export function dayBounds(day: string): { from: string; to: string } {
  return { from: bogotaInstant(day, "00:00"), to: bogotaInstant(addDays(day, 1), "00:00") };
}

const ms = (iso: string) => new Date(iso).getTime();
const overlaps = (a: { start: string; end: string }, b: { start: string; end: string }) =>
  ms(a.start) < ms(b.end) && ms(b.start) < ms(a.end);

export interface DayAgendaInput {
  day: string;
  /** Rangos del horario de ese día de la semana. */
  ranges: AgendaRange[];
  intervalMin: number;
  /** Citas que ocupan el horario (sin canceladas ni rechazadas). */
  appointments: AgendaAppointment[];
  blocks: AgendaBlock[];
}

/**
 * Lista del día ordenada por hora. Las horas libres siguen el intervalo del barbero desde el
 * inicio de cada rango, como las del cliente, y duran un intervalo. Un bloqueo que cubre todo el
 * día sale una sola vez. Las citas fuera del horario también se muestran.
 */
export function buildDayAgenda(input: DayAgendaInput): AgendaItem[] {
  const bounds = dayBounds(input.day);
  const items: AgendaItem[] = [];

  for (const appointment of input.appointments) {
    items.push({
      kind: "appointment",
      start: appointment.start,
      end: appointment.end,
      appointment,
    });
  }

  for (const block of input.blocks) {
    if (!overlaps(block, { start: bounds.from, end: bounds.to })) continue;
    const start = ms(block.start) < ms(bounds.from) ? bounds.from : block.start;
    const end = ms(block.end) > ms(bounds.to) ? bounds.to : block.end;
    items.push({
      kind: "blocked",
      start,
      end,
      block,
      allDay: start === bounds.from && end === bounds.to,
    });
  }

  const interval = Math.max(5, input.intervalMin) * MINUTE;
  const busy = [...input.appointments, ...input.blocks];
  for (const range of input.ranges) {
    const rangeEnd = ms(bogotaInstant(input.day, range.end_time));
    for (
      let t = ms(bogotaInstant(input.day, range.start_time));
      t + interval <= rangeEnd;
      t += interval
    ) {
      const slot = { start: new Date(t).toISOString(), end: new Date(t + interval).toISOString() };
      if (!busy.some((b) => overlaps(b, slot))) items.push({ kind: "free", ...slot });
    }
  }

  const order = { blocked: 0, appointment: 1, free: 2 } as const;
  return items.sort((a, b) => ms(a.start) - ms(b.start) || order[a.kind] - order[b.kind]);
}

/** Cuántas citas y horas libres tiene el día, para la barra de "Semana". */
export function dayOccupancy(items: AgendaItem[]): {
  appointments: number;
  free: number;
  ratio: number;
} {
  const appointments = items.filter((i) => i.kind === "appointment").length;
  const free = items.filter((i) => i.kind === "free").length;
  const total = appointments + free;
  return { appointments, free, ratio: total === 0 ? 0 : appointments / total };
}
