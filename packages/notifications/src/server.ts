import "server-only";
import type { BookingEvent } from "@possos/booking/events";
import {
  confirmAppointment,
  findAppointmentForPhone,
  getAppointmentForNotification,
} from "@possos/booking/server";
import { errorCode, type DbClient, type Json, type Result } from "@possos/supabase";
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
import type { NewMessageJob, WhatsappSettings } from "./internal/whatsapp-consumer";
import type { ClaimedJob, JobOutcome, JobStore } from "./internal/whatsapp-dispatch";
import type { MessageJobView, WhatsappUsage } from "./internal/whatsapp-status";
import type { WhatsappAppointment } from "./internal/whatsapp-templates";
import type { WebhookDeps } from "./internal/whatsapp-webhook";

/**
 * API de servidor de notifications: configuración de los recordatorios (F6), despacho de
 * booking_events y push (F8), y WhatsApp (F7): otro consumidor del mismo despacho, el envío de
 * los trabajos vencidos y el webhook.
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

// ---------------------------------------------------------------------------------------------
// WhatsApp (F7). Las funciones de despacho y webhook usan el cliente de la clave secreta
// (`@possos/supabase/admin`); las del panel, el de la sesión (RLS).
// ---------------------------------------------------------------------------------------------

export {
  WHATSAPP_CONSUMER,
  CONFIRMATION_MAX_AGE_MS,
  planJobs,
  whatsappConsumer,
  type NewMessageJob,
  type WhatsappConsumerDeps,
  type WhatsappSettings,
} from "./internal/whatsapp-consumer";
export {
  DISPATCH_BATCH,
  MAX_ATTEMPTS,
  RETRY_DELAYS_MIN,
  dispatchDue,
  type ClaimedJob,
  type DispatchDueDeps,
  type DueReport,
  type JobOutcome,
  type JobStore,
} from "./internal/whatsapp-dispatch";
export {
  GRAPH_API_URL,
  GRAPH_API_VERSION,
  cloudApiClient,
  whatsappSendConfigFromEnv,
  whatsappWebhookConfigFromEnv,
  type SendResult,
  type TemplateMessage,
  type WhatsAppClient,
  type WhatsAppSendConfig,
  type WhatsAppWebhookConfig,
} from "./internal/whatsapp-client";
export {
  FREE_TEXT_REPLY_EVERY_MS,
  handleWebhook,
  verifySignature,
  verifySubscription,
  type WebhookDeps,
  type WebhookReport,
} from "./internal/whatsapp-webhook";

/** La configuración de WhatsApp de notification_settings. null si la base falló. */
export async function getWhatsappSettings(admin: DbClient): Promise<WhatsappSettings | null> {
  const result = await getNotificationSettings(admin);
  if (!result.ok) return null;
  const { reminder_offsets_min, send_confirmation, send_cancellation } = result.data;
  return { reminder_offsets_min, send_confirmation, send_cancellation };
}

/**
 * La cita como la necesita WhatsApp, por la API de booking (`get_appointment_for_notification`).
 * "error" si la base falló.
 */
export function whatsappAppointmentLoader(admin: DbClient) {
  return async (id: string): Promise<WhatsappAppointment | null | "error"> => {
    const result = await getAppointmentForNotification(admin, id);
    return result.ok ? result.data : "error";
  };
}

/** message_jobs para el despacho: crear, descartar, tomar y cerrar. */
export function messageJobStore(admin: DbClient): JobStore & {
  create: (jobs: NewMessageJob[]) => Promise<boolean>;
  skipPending: (appointmentId: string) => Promise<boolean>;
} {
  return {
    create: async (jobs) => {
      const { error } = await admin.from("message_jobs").upsert(
        jobs.map((j) => ({ ...j, channel: "whatsapp" })),
        { onConflict: "appointment_id,kind,offset_min,channel", ignoreDuplicates: true },
      );
      return !error;
    },
    skipPending: async (appointmentId) => {
      const { error } = await admin
        .from("message_jobs")
        .update({
          status: "skipped",
          last_error: "APPOINTMENT_CHANGED",
          updated_at: new Date().toISOString(),
        })
        .eq("appointment_id", appointmentId)
        .eq("channel", "whatsapp")
        .eq("status", "scheduled");
      return !error;
    },
    claim: async (limit) => {
      const { data, error } = await admin.rpc("claim_message_jobs", { p_limit: limit });
      return error ? null : (data as ClaimedJob[]);
    },
    finish: async (id, outcome: JobOutcome) => {
      const { data, error } = await admin.rpc("finish_message_job", {
        p_id: id,
        p_outcome: outcome.outcome,
        p_provider_message_id: outcome.outcome === "sent" ? outcome.messageId : undefined,
        p_error:
          outcome.outcome === "skipped"
            ? outcome.reason
            : outcome.outcome === "sent"
              ? undefined
              : outcome.error,
        p_retry_at: outcome.outcome === "retry" ? outcome.at.toISOString() : undefined,
      });
      return !error && data === true;
    },
  };
}

/**
 * Lo que el webhook necesita de la base: estados, mensajes entrantes, citas y la confirmación.
 * "Confirmo" usa `confirmAppointment()` de booking (regla 4 de docs/08), no la tabla.
 */
export function whatsappWebhookStores(
  admin: DbClient,
): Omit<WebhookDeps, "phoneNumberId" | "client" | "context" | "now" | "log"> {
  return {
    recordStatus: async (update) => {
      const { error } = await admin.rpc("record_message_status", {
        p_provider_message_id: update.messageId,
        p_status: update.status,
        p_at: update.at ?? undefined,
        p_error: update.error ?? undefined,
        p_pricing_category: update.pricingCategory ?? undefined,
      });
      return !error;
    },
    inbound: {
      claim: async (record) => {
        const { data, error } = await admin
          .from("inbound_messages")
          .upsert(
            {
              provider_message_id: record.providerMessageId,
              from_phone: record.fromPhone,
              button_payload: record.buttonPayload,
              appointment_id: record.appointmentId,
              payload: record.payload as unknown as NonNullable<Json>,
            },
            { onConflict: "provider_message_id", ignoreDuplicates: true },
          )
          .select("id");
        if (error) return null;
        return data.length > 0 ? "new" : "duplicate";
      },
      release: async (providerMessageId) => {
        await admin.from("inbound_messages").delete().eq("provider_message_id", providerMessageId);
      },
      repliedRecently: async (fromPhone, since, except) => {
        const { count, error } = await admin
          .from("inbound_messages")
          .select("id", { count: "exact", head: true })
          .eq("from_phone", fromPhone)
          .is("button_payload", null)
          .gte("received_at", since)
          .neq("provider_message_id", except);
        return error ? null : (count ?? 0) > 0;
      },
    },
    appointmentForMessage: async (providerMessageId) => {
      const { data, error } = await admin
        .from("message_jobs")
        .select("appointment_id")
        .eq("provider_message_id", providerMessageId)
        .maybeSingle();
      return error ? "error" : (data?.appointment_id ?? null);
    },
    appointmentForPhone: async (phone) => {
      const result = await findAppointmentForPhone(admin, phone);
      return result.ok ? result.data : "error";
    },
    loadAppointment: whatsappAppointmentLoader(admin),
    confirm: async (appointmentId) => {
      const result = await confirmAppointment(admin, { appointmentId, via: "whatsapp" });
      if (result.ok) return "ok";
      return result.error === "INVALID_STATUS" || result.error === "NOT_FOUND"
        ? "inactive"
        : "error";
    },
  };
}

/** Los mensajes de WhatsApp de unas citas, para el panel (RLS: el barbero, las de su agenda). */
export async function listMessageJobs(
  db: DbClient,
  appointmentIds: string[],
): Promise<Result<(MessageJobView & { appointment_id: string })[], "UNKNOWN">> {
  if (appointmentIds.length === 0) return { ok: true, data: [] };
  const { data, error } = await db
    .from("message_jobs")
    .select(
      "appointment_id, channel, kind, template, status, send_at, sent_at, status_at, last_error",
    )
    .in("appointment_id", appointmentIds)
    .eq("channel", "whatsapp");
  return error ? { ok: false, error: "UNKNOWN" } : { ok: true, data };
}

/**
 * Cuántos mensajes de WhatsApp salieron en un periodo (por `sent_at`, ISO, el final sin
 * incluir), para el costo del mes en "Más". RLS: el administrador ve todos.
 */
export async function getWhatsappUsage(
  db: DbClient,
  range: { from: string; to: string },
): Promise<Result<WhatsappUsage, "UNKNOWN">> {
  const count = async (filter: (q: ReturnType<typeof base>) => ReturnType<typeof base>) => {
    const { count: n, error } = await filter(base());
    return error ? null : (n ?? 0);
  };
  const base = () =>
    db
      .from("message_jobs")
      .select("id", { count: "exact", head: true })
      .eq("channel", "whatsapp")
      .gte("sent_at", range.from)
      .lt("sent_at", range.to);
  const [accepted, delivered, marketing, failed] = await Promise.all([
    count((q) => q),
    count((q) => q.in("status", ["delivered", "read"])),
    count((q) => q.in("status", ["delivered", "read"]).eq("pricing_category", "marketing")),
    count((q) => q.eq("status", "failed")),
  ]);
  if (accepted === null || delivered === null || marketing === null || failed === null) {
    return { ok: false, error: "UNKNOWN" };
  }
  return { ok: true, data: { accepted, delivered, marketing, failed } };
}
