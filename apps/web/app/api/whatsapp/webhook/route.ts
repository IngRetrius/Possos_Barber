import {
  handleWebhook,
  verifySignature,
  verifySubscription,
  whatsappWebhookConfigFromEnv,
  whatsappWebhookStores,
} from "@possos/notifications/server";
import { createAdminClient } from "@possos/supabase/admin";
import { whatsappClient, whatsappContext } from "../../../../lib/whatsapp";

/**
 * Webhook de la Cloud API de WhatsApp (F7, docs/03). Se configura en Meta con esta URL y con
 * WHATSAPP_WEBHOOK_VERIFY_TOKEN; cada POST viene firmado con el secreto de la app
 * (WHATSAPP_APP_SECRET) en `X-Hub-Signature-256`. Los dos valores viven solo en Vercel (regla 6).
 *
 * - GET: la verificación de Meta. Devuelve `hub.challenge` si el token coincide; si no, 403.
 * - POST: estados de los mensajes y respuestas de los clientes. Sin firma válida, 401. Si la base
 *   falla, 500 para que Meta reintente (los mensajes se registran por su id: no se repiten).
 */
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const log = (message: string, detail?: unknown) =>
  console.error(`[whatsapp] ${message}`, detail ?? "");

export async function GET(request: Request): Promise<Response> {
  const config = whatsappWebhookConfigFromEnv();
  if (!config) return new Response("Not configured", { status: 503 });
  const challenge = verifySubscription(new URL(request.url).searchParams, config.verifyToken);
  return challenge === null
    ? new Response("Forbidden", { status: 403 })
    : new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
}

export async function POST(request: Request): Promise<Response> {
  const config = whatsappWebhookConfigFromEnv();
  if (!config) return Response.json({ ok: false, error: "NOT_CONFIGURED" }, { status: 503 });

  // La firma es sobre los bytes tal como llegaron, antes de leerlos como JSON.
  const raw = new Uint8Array(await request.arrayBuffer());
  if (!verifySignature(raw, request.headers.get("x-hub-signature-256"), config.appSecret)) {
    return Response.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return Response.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  const admin = createAdminClient();
  const report = await handleWebhook(payload, {
    ...whatsappWebhookStores(admin),
    phoneNumberId: config.phoneNumberId,
    client: whatsappClient(),
    context: whatsappContext(),
    log,
  });
  return Response.json(report, { status: report.ok ? 200 : 500 });
}
