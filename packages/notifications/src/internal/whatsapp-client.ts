/**
 * Cliente HTTP de la Cloud API de WhatsApp (Meta), directo y sin intermediarios (regla 5).
 *
 * El despacho y el webhook solo conocen la interfaz `WhatsAppClient`: en Vitest se cambia por uno
 * falso y en Playwright la URL apunta a un servidor falso (`WHATSAPP_API_URL`). Los secretos se
 * leen del entorno y nunca van en el repo (regla 6).
 */

/** Versión de la Graph API. Meta mantiene cada versión unos 2 años; se sube a mano. */
export const GRAPH_API_VERSION = "v24.0";
export const GRAPH_API_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export type TemplateParameter =
  { type: "text"; text: string } | { type: "payload"; payload: string };

export type TemplateComponent =
  | { type: "body"; parameters: TemplateParameter[] }
  | {
      type: "button";
      sub_type: "url" | "quick_reply";
      index: string;
      parameters: TemplateParameter[];
    };

/** El objeto `template` de un mensaje de plantilla. */
export interface TemplateMessage {
  name: string;
  language: { code: string };
  components: TemplateComponent[];
}

export type SendResult =
  | { ok: true; messageId: string }
  | {
      ok: false;
      /** Vale la pena reintentar (red, 5xx, límite de envío, token vencido). */
      retryable: boolean;
      /** "131026: Message undeliverable", para `last_error`. Sin datos del cliente. */
      error: string;
      code?: number;
    };

export interface WhatsAppClient {
  /** Mensaje de plantilla (los que el negocio inicia). `to`: celular en E.164. */
  sendTemplate: (to: string, template: TemplateMessage) => Promise<SendResult>;
  /** Texto libre: solo vale dentro de las 24 h desde el último mensaje del cliente. */
  sendText: (to: string, body: string, replyTo?: string) => Promise<SendResult>;
}

/** Lo necesario para mandar mensajes. */
export interface WhatsAppSendConfig {
  /** Token de acceso de un usuario del sistema del portafolio de negocio. */
  accessToken: string;
  /** Identificador del número en la Cloud API (no es el número). */
  phoneNumberId: string;
  /** Base de la Graph API, con la versión. En las pruebas, un servidor falso. */
  apiUrl: string;
}

/** Lo necesario para recibir el webhook. */
export interface WhatsAppWebhookConfig {
  /** Secreto de la app de Meta: firma `X-Hub-Signature-256`. */
  appSecret: string;
  /** El texto que se escribe al configurar el webhook en Meta (`hub.verify_token`). */
  verifyToken: string;
  /** Si llega, solo se aceptan cambios de este número. */
  phoneNumberId: string | null;
}

type Env = Record<string, string | undefined>;

/** null si falta el token o el número: entonces no se programa ni se manda nada. */
export function whatsappSendConfigFromEnv(env: Env = process.env): WhatsAppSendConfig | null {
  const accessToken = env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!accessToken || !phoneNumberId) return null;
  const apiUrl = (env.WHATSAPP_API_URL?.trim() || GRAPH_API_URL).replace(/\/+$/, "");
  return { accessToken, phoneNumberId, apiUrl };
}

/** null si falta el secreto de la app o el token de verificación: el webhook responde 503. */
export function whatsappWebhookConfigFromEnv(env: Env = process.env): WhatsAppWebhookConfig | null {
  const appSecret = env.WHATSAPP_APP_SECRET?.trim();
  const verifyToken = env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim();
  if (!appSecret || !verifyToken) return null;
  return { appSecret, verifyToken, phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID?.trim() || null };
}

/** "+573001234567" → "573001234567", como lo usa la Cloud API en `to` y en `from`. */
export function waNumber(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Códigos de error de Meta que vale la pena reintentar: fallas del servicio, límites de envío y
 * autenticación (un token vencido se puede cambiar mientras el trabajo espera). Los demás (número
 * sin WhatsApp, plantilla inexistente, parámetro inválido) no se arreglan reintentando.
 */
const RETRYABLE_CODES = new Set([
  0, 1, 2, 4, 190, 80007, 130429, 131000, 131016, 131048, 131056, 133004,
]);

export function isRetryableCode(code: number | undefined): boolean {
  return code !== undefined && RETRYABLE_CODES.has(code);
}

interface GraphError {
  error?: { code?: number; message?: string; error_data?: { details?: string } };
}

const TIMEOUT_MS = 10_000;

export function cloudApiClient(
  config: WhatsAppSendConfig,
  fetchImpl: typeof fetch = fetch,
): WhatsAppClient {
  const post = async (body: Record<string, unknown>): Promise<SendResult> => {
    let response: Response;
    try {
      response = await fetchImpl(`${config.apiUrl}/${config.phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          ...body,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      const name = error instanceof Error ? error.name : "Error";
      return { ok: false, retryable: true, error: name === "TimeoutError" ? "TIMEOUT" : "NETWORK" };
    }

    const json = (await response.json().catch(() => null)) as
      (GraphError & { messages?: { id?: string }[] }) | null;
    const messageId = json?.messages?.[0]?.id;
    if (response.ok && messageId) return { ok: true, messageId };

    const code = json?.error?.code;
    const detail = json?.error?.message ?? `HTTP ${response.status}`;
    return {
      ok: false,
      retryable: response.status >= 500 || response.status === 429 || isRetryableCode(code),
      error: (code !== undefined ? `${code}: ${detail}` : detail).slice(0, 300),
      code,
    };
  };

  return {
    sendTemplate: (to, template) => post({ to: waNumber(to), type: "template", template }),
    sendText: (to, body, replyTo) =>
      post({
        to: waNumber(to),
        type: "text",
        text: { preview_url: true, body },
        ...(replyTo ? { context: { message_id: replyTo } } : {}),
      }),
  };
}
