import { createHmac, timingSafeEqual } from "node:crypto";
import { waNumber, type WhatsAppClient } from "./whatsapp-client";
import {
  actionFromButtonText,
  parseButtonPayload,
  replies,
  type ButtonAction,
  type MessageContext,
  type WhatsappAppointment,
} from "./whatsapp-templates";

/**
 * Webhook de la Cloud API (F7): Meta manda los estados de los mensajes y lo que escriben los
 * clientes. Ver https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks.
 */

// ---------------------------------------------------------------------------------------------
// Verificación
// ---------------------------------------------------------------------------------------------

/**
 * `X-Hub-Signature-256: sha256=<hex>`: HMAC-SHA256 del cuerpo tal como llegó (los bytes, antes
 * de leerlo como JSON) con el secreto de la app. Comparación en tiempo constante.
 */
export function verifySignature(
  rawBody: string | Uint8Array,
  header: string | null | undefined,
  appSecret: string,
): boolean {
  const match = /^sha256=([0-9a-f]{64})$/i.exec(header?.trim() ?? "");
  if (!match || !appSecret) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest();
  const given = Buffer.from(match[1]!, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * La verificación que hace Meta al configurar el webhook: un GET con `hub.mode=subscribe`,
 * `hub.verify_token` y `hub.challenge`. Devuelve el challenge si el token coincide, o null.
 */
export function verifySubscription(params: URLSearchParams, verifyToken: string): string | null {
  const token = params.get("hub.verify_token") ?? "";
  const challenge = params.get("hub.challenge");
  if (params.get("hub.mode") !== "subscribe" || challenge === null || !verifyToken) return null;
  const a = Buffer.from(token);
  const b = Buffer.from(verifyToken);
  return a.length === b.length && timingSafeEqual(a, b) ? challenge : null;
}

// ---------------------------------------------------------------------------------------------
// Carga
// ---------------------------------------------------------------------------------------------

export interface WebhookStatus {
  id: string;
  status: string;
  timestamp?: string;
  recipient_id?: string;
  errors?: { code?: number; title?: string; message?: string }[];
  pricing?: { billable?: boolean; pricing_model?: string; category?: string; type?: string };
}

export interface WebhookMessage {
  id: string;
  from: string;
  timestamp?: string;
  type: string;
  context?: { from?: string; id?: string };
  button?: { payload?: string; text?: string };
  interactive?: { type?: string; button_reply?: { id?: string; title?: string } };
  text?: { body?: string };
}

interface WebhookValue {
  messaging_product?: string;
  metadata?: { display_phone_number?: string; phone_number_id?: string };
  statuses?: WebhookStatus[];
  messages?: WebhookMessage[];
}

interface WebhookPayload {
  object?: string;
  entry?: { id?: string; changes?: { field?: string; value?: WebhookValue }[] }[];
}

/** Los cambios de `messages` de un número (o de cualquiera, si no se sabe cuál es el nuestro). */
function changesOf(payload: unknown, phoneNumberId: string | null): WebhookValue[] {
  const p = payload as WebhookPayload | null;
  if (!p || p.object !== "whatsapp_business_account" || !Array.isArray(p.entry)) return [];
  return p.entry.flatMap((entry) =>
    (entry.changes ?? []).flatMap((change) => {
      const value = change.value;
      if (change.field !== "messages" || !value) return [];
      if (phoneNumberId && value.metadata?.phone_number_id !== phoneNumberId) return [];
      return [value];
    }),
  );
}

const STATUSES = new Set(["sent", "delivered", "read", "failed"]);

function isoFromUnix(timestamp: string | undefined): string | null {
  const seconds = Number(timestamp);
  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000).toISOString() : null;
}

/** "573000000001" → "+573000000001". */
function e164(from: string): string {
  return `+${waNumber(from)}`;
}

// ---------------------------------------------------------------------------------------------
// Proceso
// ---------------------------------------------------------------------------------------------

export interface StatusUpdate {
  messageId: string;
  status: "sent" | "delivered" | "read" | "failed";
  at: string | null;
  error: string | null;
  pricingCategory: string | null;
}

export interface InboundRecord {
  providerMessageId: string;
  /** E.164. */
  fromPhone: string;
  buttonPayload: string | null;
  appointmentId: string | null;
  payload: WebhookMessage;
}

export interface WebhookDeps {
  /** Si llega, se ignoran los cambios de otros números de la cuenta. */
  phoneNumberId: string | null;
  /** `record_message_status`. false si la base falló. */
  recordStatus: (update: StatusUpdate) => Promise<boolean>;
  inbound: {
    /** Registra el mensaje: `duplicate` si ya se había procesado (Meta reintenta). null si falló. */
    claim: (record: InboundRecord) => Promise<"new" | "duplicate" | null>;
    /** Lo borra si procesarlo falló, para que el reintento de Meta lo procese otra vez. */
    release: (providerMessageId: string) => Promise<void>;
    /** Si ya se le contestó un texto libre a ese celular desde `since` (sin contar este). */
    repliedRecently: (fromPhone: string, since: string, except: string) => Promise<boolean | null>;
  };
  /** La cita de un mensaje que mandamos (el `context.id` de una respuesta). */
  appointmentForMessage: (providerMessageId: string) => Promise<string | null | "error">;
  /** La próxima cita (o la última) de un celular. */
  appointmentForPhone: (phone: string) => Promise<string | null | "error">;
  loadAppointment: (id: string) => Promise<WhatsappAppointment | null | "error">;
  /** `confirmAppointment(..., via: "whatsapp")` de booking. */
  confirm: (appointmentId: string) => Promise<"ok" | "inactive" | "error">;
  /** null sin token: se registra todo, pero no se contesta. */
  client: WhatsAppClient | null;
  context: MessageContext;
  now?: () => Date;
  log?: (message: string, detail?: unknown) => void;
}

export interface WebhookReport {
  /** false: algo falló en la base y conviene que Meta reintente (la ruta responde 500). */
  ok: boolean;
  statuses: number;
  messages: number;
  duplicates: number;
}

/** A un texto libre se le contesta una vez cada 12 horas por celular. */
export const FREE_TEXT_REPLY_EVERY_MS = 12 * 60 * 60 * 1000;

/**
 * Procesa una carga del webhook ya verificada. Los estados solo avanzan (la base lo decide); los
 * mensajes se registran en inbound_messages por su id, así que un reintento de Meta no confirma
 * ni contesta dos veces.
 */
export async function handleWebhook(payload: unknown, deps: WebhookDeps): Promise<WebhookReport> {
  const log = deps.log ?? (() => {});
  const now = deps.now ?? (() => new Date());
  const report: WebhookReport = { ok: true, statuses: 0, messages: 0, duplicates: 0 };

  const reply = async (to: string, body: string, replyTo?: string) => {
    if (!deps.client) return;
    const sent = await deps.client.sendText(to, body, replyTo).catch(() => null);
    if (!sent?.ok) log("No se pudo contestar un mensaje", sent && !sent.ok ? sent.error : null);
  };

  /** La cita de un botón, comprobando que el mensaje viene del celular de esa cita. */
  const ownAppointment = async (
    message: WebhookMessage,
    appointmentId: string | null,
  ): Promise<WhatsappAppointment | null | "error"> => {
    let id = appointmentId;
    if (!id && message.context?.id) {
      const found = await deps.appointmentForMessage(message.context.id);
      if (found === "error") return "error";
      id = found;
    }
    if (!id) return null;
    const appointment = await deps.loadAppointment(id);
    if (appointment === "error" || !appointment) return appointment;
    const phone = appointment.customer_phone ? waNumber(appointment.customer_phone) : null;
    if (phone !== waNumber(message.from)) {
      log("Un botón llegó de un celular que no es el de la cita", appointment.appointment_id);
      return null;
    }
    return appointment;
  };

  const handleButton = async (message: WebhookMessage, action: ButtonAction, id: string | null) => {
    const appointment = await ownAppointment(message, id);
    if (appointment === "error") return false;
    const to = e164(message.from);
    if (!appointment) {
      await reply(to, replies.notActive(deps.context), message.id);
      return true;
    }
    if (action === "change") {
      await reply(to, replies.change(appointment, deps.context), message.id);
      return true;
    }
    const confirmed = await deps.confirm(appointment.appointment_id);
    if (confirmed === "error") return false;
    await reply(
      to,
      confirmed === "ok"
        ? replies.confirmed(appointment, deps.context)
        : replies.notActive(deps.context),
      message.id,
    );
    return true;
  };

  const handleFreeText = async (message: WebhookMessage) => {
    const from = e164(message.from);
    const since = new Date(now().getTime() - FREE_TEXT_REPLY_EVERY_MS).toISOString();
    const recent = await deps.inbound.repliedRecently(from, since, message.id);
    if (recent === null) return false;
    if (recent) return true;

    let appointmentId: string | null = null;
    if (message.context?.id) {
      const found = await deps.appointmentForMessage(message.context.id);
      if (found !== "error") appointmentId = found;
    }
    if (!appointmentId) {
      const found = await deps.appointmentForPhone(from);
      if (found !== "error") appointmentId = found;
    }
    const appointment = appointmentId ? await deps.loadAppointment(appointmentId) : null;
    const contact =
      appointment && appointment !== "error" && appointment.barber_whatsapp_url
        ? appointment.barber_whatsapp_url
        : deps.context.fallbackContactUrl;
    await reply(from, replies.freeText(contact));
    return true;
  };

  for (const value of changesOf(payload, deps.phoneNumberId)) {
    for (const status of value.statuses ?? []) {
      if (!status?.id || !STATUSES.has(status.status)) continue;
      const error = status.errors?.[0];
      const saved = await deps.recordStatus({
        messageId: status.id,
        status: status.status as StatusUpdate["status"],
        at: isoFromUnix(status.timestamp),
        error: error ? `${error.code ?? "?"}: ${error.title ?? error.message ?? ""}`.trim() : null,
        pricingCategory: status.pricing?.category ?? null,
      });
      if (saved) report.statuses++;
      else report.ok = false;
    }

    for (const message of value.messages ?? []) {
      if (!message?.id || !message.from) continue;
      const rawPayload =
        message.type === "button"
          ? (message.button?.payload ?? null)
          : message.type === "interactive"
            ? (message.interactive?.button_reply?.id ?? null)
            : null;
      const buttonText =
        message.type === "button"
          ? message.button?.text
          : message.type === "interactive"
            ? message.interactive?.button_reply?.title
            : null;
      const parsed = parseButtonPayload(rawPayload);
      const action = parsed?.action ?? actionFromButtonText(buttonText);

      const claimed = await deps.inbound.claim({
        providerMessageId: message.id,
        fromPhone: e164(message.from),
        buttonPayload: action ? (rawPayload ?? action) : null,
        appointmentId: parsed?.appointmentId ?? null,
        payload: message,
      });
      if (claimed === null) {
        report.ok = false;
        continue;
      }
      if (claimed === "duplicate") {
        report.duplicates++;
        continue;
      }

      let done: boolean;
      try {
        done = action
          ? await handleButton(message, action, parsed?.appointmentId ?? null)
          : await handleFreeText(message);
      } catch (error) {
        log("Falló un mensaje del webhook", error);
        done = false;
      }
      if (done) {
        report.messages++;
      } else {
        await deps.inbound.release(message.id);
        report.ok = false;
      }
    }
  }
  return report;
}
