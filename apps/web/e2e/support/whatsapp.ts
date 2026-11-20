import { createHmac } from "node:crypto";
import { createServer, type Server } from "node:http";
import { appEnv } from "./supabase";

/*
 * F7: WhatsApp sin Meta. Un servidor falso de la Graph API en el puerto de WHATSAPP_API_URL
 * (http://127.0.0.1:3901 en local y en CI) que acepta cada mensaje y lo guarda, y cargas del
 * webhook firmadas con WHATSAPP_APP_SECRET, con la forma de los ejemplos de Meta.
 *
 * Las variables de WhatsApp de las pruebas son valores desechables: en CI se generan en cada
 * corrida y en local viven en apps/web/.env.local (nunca en el repo, regla 6).
 */

export interface SentMessage {
  to: string;
  type: string;
  template?: { name: string; components: { type: string; parameters: { text?: string }[] }[] };
  text?: { body: string };
  context?: { message_id: string };
  messageId: string;
}

export function whatsappEnv() {
  const apiUrl = appEnv("WHATSAPP_API_URL");
  const appSecret = appEnv("WHATSAPP_APP_SECRET");
  const verifyToken = appEnv("WHATSAPP_WEBHOOK_VERIFY_TOKEN");
  const phoneNumberId = appEnv("WHATSAPP_PHONE_NUMBER_ID");
  if (!apiUrl || !appSecret || !verifyToken || !phoneNumberId || !appEnv("WHATSAPP_ACCESS_TOKEN")) {
    throw new Error(
      "Faltan las variables de WhatsApp de prueba (WHATSAPP_*); ver fases/F7-entrega.md",
    );
  }
  return { apiUrl, appSecret, verifyToken, phoneNumberId };
}

/** La Graph API falsa: responde como Meta (`messages[0].id`) y guarda lo que recibe. */
export async function startFakeGraph(): Promise<{
  sent: SentMessage[];
  close: () => Promise<void>;
}> {
  const { apiUrl, phoneNumberId } = whatsappEnv();
  const url = new URL(apiUrl);
  const sent: SentMessage[] = [];
  let n = 0;
  const server: Server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      if (req.method !== "POST" || !req.url?.endsWith(`/${phoneNumberId}/messages`)) {
        res.writeHead(404).end();
        return;
      }
      const messageId = `wamid.E2E${Date.now()}${++n}`;
      sent.push({ ...(JSON.parse(body) as Omit<SentMessage, "messageId">), messageId });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ messaging_product: "whatsapp", messages: [{ id: messageId }] }));
    });
  });
  await new Promise<void>((resolve) => server.listen(Number(url.port), url.hostname, resolve));
  return { sent, close: () => new Promise((resolve) => server.close(() => resolve())) };
}

/** Un cambio de `messages` del webhook, como lo manda Meta. */
export function webhookPayload(value: Record<string, unknown>) {
  const { phoneNumberId } = whatsappEnv();
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "102290129340398",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: { display_phone_number: "573110000000", phone_number_id: phoneNumberId },
              ...value,
            },
            field: "messages",
          },
        ],
      },
    ],
  };
}

/** Cuerpo y encabezados de un POST firmado con el secreto de la app. */
export function signed(payload: unknown, secret = whatsappEnv().appSecret) {
  const data = JSON.stringify(payload);
  const signature = `sha256=${createHmac("sha256", secret).update(data).digest("hex")}`;
  return {
    data,
    headers: { "Content-Type": "application/json", "X-Hub-Signature-256": signature },
  };
}
