/**
 * Contrato de los eventos que publica booking en la tabla booking_events (regla 3 de docs/08).
 * Los escribe un trigger de Postgres; otros módulos (notifications) los leen con su cursor.
 *
 * Versionado: un cambio que rompa el payload sube `version` y agrega un tipo nuevo aquí; los
 * consumidores siguen leyendo las versiones que conocen.
 */
import type { AppointmentStatus } from "./index";

export const BOOKING_EVENT_TYPES = [
  "appointment.created",
  "appointment.rescheduled",
  "appointment.cancelled",
  "appointment.status_changed",
] as const;

export type BookingEventType = (typeof BOOKING_EVENT_TYPES)[number];

/**
 * Payload de la versión 1. Sin datos personales: solo identificadores y fechas.
 *
 * - `appointment.created`: cita nueva (cliente o personal).
 * - `appointment.rescheduled`: cita nueva que reemplaza a `rescheduled_from`. La anterior queda
 *   cancelada sin evento propio, así que el consumidor descarta lo programado para ella.
 * - `appointment.cancelled`: cancelada por `cancelled_by`.
 * - `appointment.status_changed`: cualquier otro cambio de estado (confirmada, aprobada,
 *   rechazada, completed, no_show), con `previous_status`.
 */
export interface AppointmentEventPayloadV1 {
  appointment_id: string;
  barber_id: string;
  customer_id: string;
  service_id: string;
  /** ISO 8601. */
  start_at: string;
  /** ISO 8601. */
  end_at: string;
  status: AppointmentStatus;
  previous_status: AppointmentStatus | null;
  source: "customer" | "staff";
  cancelled_by: "customer" | "staff" | null;
  rescheduled_from: string | null;
}

export interface BookingEventV1 {
  id: number;
  type: BookingEventType;
  version: 1;
  appointment_id: string | null;
  payload: AppointmentEventPayloadV1;
  created_at: string;
}

export type BookingEvent = BookingEventV1;
