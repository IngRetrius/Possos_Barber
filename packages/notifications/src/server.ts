import "server-only";
import type { BookingEvent } from "@possos/booking/events";
import { errorCode, type DbClient, type Result } from "@possos/supabase";
import type { NotificationSettings } from "./index";
import {
  runConsumer,
  type ConsumerReport,
  type CursorStore,
  type EventConsumer,
} from "./internal/dispatch";
import { TEST_PUSH_MESSAGE } from "./internal/push-message";
import type { ValidReminderSettings } from "./internal/settings";
import { webPushSender, type PushTarget, type VapidConfig } from "./internal/web-push";

/**
 * API de servidor de notifications: configuración de los recordatorios (F6), despacho de
 * booking_events y push (F8). WhatsApp llega en F7 como otro consumidor del mismo despacho.
 */

type R<T> = Promise<Result<T, "FORBIDDEN" | "UNKNOWN">>;

export async function getNotificationSettings(db: DbClient): R<NotificationSettings> {
  const { data, error } = await db.from("notification_settings").select("*").maybeSingle();
  if (error || !data) return { ok: false, error: "UNKNOWN" };
  return { ok: true, data };
}

/** Solo el administrador (RLS: para los demás, el update no toca ninguna fila). */
export async function updateNotificationSettings(
  db: DbClient,
  patch: ValidReminderSettings,
): R<NotificationSettings> {
  const { data, error } = await db
    .from("notification_settings")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", true)
    .select("*")
    .maybeSingle();
  if (error) return { ok: false, error: "UNKNOWN" };
  return data ? { ok: true, data } : { ok: false, error: "FORBIDDEN" };
}

// ---------------------------------------------------------------------------------------------
// Despacho (solo con el cliente de la clave secreta, `@possos/supabase/admin`)
// ---------------------------------------------------------------------------------------------

export type { ConsumerReport, EventConsumer } from "./internal/dispatch";
export {
  PUSH_CONSUMER,
  PUSH_MAX_AGE_MS,
  pushConsumer,
  type PushConsumerDeps,
} from "./internal/push-consumer";
export {
  vapidFromEnv,
  webPushSender,
  type PushSender,
  type PushTarget,
  type SendReport,
  type VapidConfig,
} from "./internal/web-push";

/** Cursores en event_cursors con `claim_booking_events` y `ack_booking_events`. */
export function cursorStore(admin: DbClient): CursorStore {
  return {
    claim: async (consumer, limit) => {
      const { data, error } = await admin.rpc("claim_booking_events", {
        p_consumer: consumer,
        p_limit: limit,
      });
      if (error) return errorCode(error, ["BUSY"]) === "BUSY" ? "busy" : null;
      return data as unknown as BookingEvent[];
    },
    ack: async (consumer, lastEventId) => {
      const { data, error } = await admin.rpc("ack_booking_events", {
        p_consumer: consumer,
        p_last_event_id: lastEventId ?? undefined,
      });
      return error ? null : data;
    },
  };
}

/**
 * Corre cada consumidor sobre sus eventos pendientes. Lo llama la ruta de despacho de la app,
 * que dispara pg_net con cada evento y pg_cron cada minuto si algo quedó atrás.
 */
export async function dispatchBookingEvents(
  admin: DbClient,
  consumers: EventConsumer[],
  log?: (message: string, detail?: unknown) => void,
): Promise<Record<string, ConsumerReport>> {
  const store = cursorStore(admin);
  const reports: Record<string, ConsumerReport> = {};
  for (const consumer of consumers) {
    reports[consumer.name] = await runConsumer(store, consumer, log);
  }
  return reports;
}

/** Suscripciones de la cuenta del barbero de una cita, y borrar las muertas. */
export function pushTargets(admin: DbClient) {
  return {
    listTargets: async (barberId: string): Promise<PushTarget[] | null> => {
      const { data, error } = await admin.rpc("list_push_targets", { p_barber_id: barberId });
      return error ? null : data;
    },
    removeTargets: async (endpoints: string[]) => {
      await admin.from("push_subscriptions").delete().in("endpoint", endpoints);
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Suscripciones del celular (con el cliente de la sesión)
// ---------------------------------------------------------------------------------------------

export type PushSubscriptionError = "NOT_AUTHENTICATED" | "FORBIDDEN" | "INVALID_INPUT" | "UNKNOWN";

export interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Guarda la suscripción de este navegador. Solo un barbero (`save_push_subscription`). */
export async function savePushSubscription(
  db: DbClient,
  input: PushSubscriptionInput,
): Promise<Result<null, PushSubscriptionError>> {
  const { error } = await db.rpc("save_push_subscription", {
    p_endpoint: input.endpoint,
    p_p256dh: input.p256dh,
    p_auth: input.auth,
  });
  if (error) {
    return {
      ok: false,
      error: errorCode(error, ["NOT_AUTHENTICATED", "FORBIDDEN", "INVALID_INPUT"] as const),
    };
  }
  return { ok: true, data: null };
}

/** Borra la suscripción de este navegador (RLS: solo las propias). */
export async function deletePushSubscription(
  db: DbClient,
  endpoint: string,
): Promise<Result<null, "UNKNOWN">> {
  const { error } = await db.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return error ? { ok: false, error: "UNKNOWN" } : { ok: true, data: null };
}

/**
 * Aviso de prueba a las suscripciones de la cuenta de la sesión ("Enviar un aviso de prueba"
 * en "Más"). Sirve para comprobar en el celular real que los avisos llegan.
 */
export async function sendTestPush(
  db: DbClient,
  vapid: VapidConfig,
  endpoint: string,
): Promise<Result<{ sent: number }, "NOT_FOUND" | "UNKNOWN">> {
  const { data, error } = await db
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("endpoint", endpoint);
  if (error) return { ok: false, error: "UNKNOWN" };
  if (data.length === 0) return { ok: false, error: "NOT_FOUND" };
  const report = await webPushSender(vapid)(data, TEST_PUSH_MESSAGE);
  if (report.gone.length > 0) {
    await db.from("push_subscriptions").delete().in("endpoint", report.gone);
    return { ok: false, error: "NOT_FOUND" };
  }
  return report.sent > 0
    ? { ok: true, data: { sent: report.sent } }
    : { ok: false, error: "UNKNOWN" };
}
