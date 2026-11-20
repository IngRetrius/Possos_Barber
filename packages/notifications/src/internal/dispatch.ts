import type { BookingEvent } from "@possos/booking/events";

/**
 * Despacho de booking_events por consumidor (docs/07, F8). Cada consumidor tiene su cursor en
 * event_cursors y avanza solo: si WhatsApp (F7) falla, push sigue, y al revés.
 *
 * Entrega al menos una vez y en orden. `claim` toma el turno y los eventos después del cursor;
 * `ack` avanza el cursor hasta el último evento resuelto y suelta el turno. Si un evento pide
 * reintento (o lanza), el cursor queda antes de él y lo vuelve a tomar el siguiente despacho
 * (el aviso de la base o el respaldo de pg_cron, cada minuto). Por eso cada consumidor debe
 * tolerar ver un evento dos veces.
 */
export interface EventConsumer {
  /** Nombre del cursor. Debe estar en `private.notifications_consumers()` de la base. */
  name: string;
  /** `done`: resuelto (también si no había nada que hacer). `retry`: falló y hay que repetirlo. */
  handle: (event: BookingEvent) => Promise<"done" | "retry">;
}

export interface CursorStore {
  /** `busy`: otro despacho tiene el turno (no se llama a `ack`). null si falló. */
  claim: (consumer: string, limit: number) => Promise<BookingEvent[] | "busy" | null>;
  /** Devuelve si quedan eventos después del cursor; null si falló. */
  ack: (consumer: string, lastEventId: number | null) => Promise<boolean | null>;
}

export interface ConsumerReport {
  /** Eventos resueltos (avancen o no un aviso). */
  handled: number;
  /** Quedó un evento para el siguiente despacho. */
  pending: boolean;
  /** Otro despacho tenía el turno. */
  busy?: boolean;
  error?: "CLAIM_FAILED" | "ACK_FAILED" | "HANDLER_FAILED";
}

export const BATCH_SIZE = 50;
/** Vueltas por despacho: con más pendientes, sigue el próximo aviso o el respaldo. */
export const MAX_ROUNDS = 5;

export async function runConsumer(
  store: CursorStore,
  consumer: EventConsumer,
  log: (message: string, detail?: unknown) => void = () => {},
): Promise<ConsumerReport> {
  const report: ConsumerReport = { handled: 0, pending: false };

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const events = await store.claim(consumer.name, BATCH_SIZE);
    // Otro despacho tiene el turno: al soltarlo, él mismo vuelve a mirar si quedan eventos.
    if (events === "busy") return { ...report, busy: true };
    if (events === null) return { ...report, pending: true, error: "CLAIM_FAILED" };

    let last: number | null = null;
    let stopped = false;
    try {
      for (const event of events) {
        let outcome: "done" | "retry";
        try {
          outcome = await consumer.handle(event);
        } catch (error) {
          log(`El consumidor ${consumer.name} falló con el evento ${event.id}`, error);
          outcome = "retry";
        }
        if (outcome === "retry") {
          stopped = true;
          report.error = "HANDLER_FAILED";
          break;
        }
        last = event.id;
        report.handled++;
      }
    } finally {
      const more = await store.ack(consumer.name, last);
      if (more === null) report.error = "ACK_FAILED";
      report.pending = more !== false;
    }

    // Sin progreso (turno de otro despacho, hueco reciente o un reintento), al día, o error:
    // termina. Lo que quede lo toma el siguiente despacho.
    if (stopped || events.length === 0 || !report.pending || report.error) break;
  }
  return report;
}
