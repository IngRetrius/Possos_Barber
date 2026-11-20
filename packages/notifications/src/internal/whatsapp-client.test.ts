import { describe, expect, it, vi } from "vitest";
import {
  cloudApiClient,
  GRAPH_API_URL,
  isRetryableCode,
  waNumber,
  whatsappSendConfigFromEnv,
  whatsappWebhookConfigFromEnv,
} from "./whatsapp-client";

const config = {
  accessToken: "token-prueba",
  phoneNumberId: "1065",
  apiUrl: "https://graph.test/v24.0",
};

function fetchReturning(status: number, body: unknown) {
  return vi.fn(
    async (_url: string | URL | Request, _init?: RequestInit) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
  );
}

describe("cloudApiClient", () => {
  it("manda la plantilla al número sin el +, con el token, y devuelve el id de Meta", async () => {
    const fetchImpl = fetchReturning(200, {
      messaging_product: "whatsapp",
      contacts: [{ input: "573001234567", wa_id: "573001234567" }],
      messages: [{ id: "wamid.HBgM", message_status: "accepted" }],
    });
    const client = cloudApiClient(config, fetchImpl);
    const template = { name: "recordatorio_2h", language: { code: "es" }, components: [] };
    expect(await client.sendTemplate("+573001234567", template)).toEqual({
      ok: true,
      messageId: "wamid.HBgM",
    });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://graph.test/v24.0/1065/messages");
    expect((init!.headers as Record<string, string>).Authorization).toBe("Bearer token-prueba");
    expect(JSON.parse(init!.body as string)).toEqual({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "573001234567",
      type: "template",
      template,
    });
  });

  it("un texto de respuesta lleva el mensaje al que contesta", async () => {
    const fetchImpl = fetchReturning(200, { messages: [{ id: "wamid.T" }] });
    await cloudApiClient(config, fetchImpl).sendText("+573001234567", "Listo", "wamid.ORIG");
    expect(JSON.parse(fetchImpl.mock.calls[0]![1]!.body as string)).toMatchObject({
      type: "text",
      text: { body: "Listo", preview_url: true },
      context: { message_id: "wamid.ORIG" },
    });
  });

  it("un número sin WhatsApp no se reintenta", async () => {
    const fetchImpl = fetchReturning(400, {
      error: { message: "Message undeliverable", type: "OAuthException", code: 131026 },
    });
    expect(
      await cloudApiClient(config, fetchImpl).sendTemplate("+573001234567", {
        name: "x",
        language: { code: "es" },
        components: [],
      }),
    ).toEqual({
      ok: false,
      retryable: false,
      error: "131026: Message undeliverable",
      code: 131026,
    });
  });

  it("el límite de envío, los 5xx y la red caída se reintentan", async () => {
    const t = { name: "x", language: { code: "es" }, components: [] };
    const limit = fetchReturning(400, { error: { message: "Rate limit hit", code: 130429 } });
    expect((await cloudApiClient(config, limit).sendTemplate("+57", t)).ok).toBe(false);
    expect(await cloudApiClient(config, limit).sendTemplate("+57", t)).toMatchObject({
      retryable: true,
    });
    const down = fetchReturning(503, {});
    expect(await cloudApiClient(config, down).sendTemplate("+57", t)).toMatchObject({
      retryable: true,
      error: "HTTP 503",
    });
    const offline = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    expect(await cloudApiClient(config, offline).sendTemplate("+57", t)).toEqual({
      ok: false,
      retryable: true,
      error: "NETWORK",
    });
  });

  it("clasifica los códigos de Meta", () => {
    expect(isRetryableCode(131000)).toBe(true);
    expect(isRetryableCode(190)).toBe(true);
    expect(isRetryableCode(132001)).toBe(false);
    expect(isRetryableCode(undefined)).toBe(false);
  });
});

describe("configuración por variables de entorno", () => {
  it("sin token o sin número no hay envío", () => {
    expect(whatsappSendConfigFromEnv({})).toBeNull();
    expect(whatsappSendConfigFromEnv({ WHATSAPP_ACCESS_TOKEN: "t" })).toBeNull();
    expect(
      whatsappSendConfigFromEnv({ WHATSAPP_ACCESS_TOKEN: "t", WHATSAPP_PHONE_NUMBER_ID: "1" }),
    ).toEqual({ accessToken: "t", phoneNumberId: "1", apiUrl: GRAPH_API_URL });
    expect(
      whatsappSendConfigFromEnv({
        WHATSAPP_ACCESS_TOKEN: "t",
        WHATSAPP_PHONE_NUMBER_ID: "1",
        WHATSAPP_API_URL: "http://127.0.0.1:3901/",
      })?.apiUrl,
    ).toBe("http://127.0.0.1:3901");
  });

  it("el webhook necesita el secreto de la app y el token de verificación", () => {
    expect(whatsappWebhookConfigFromEnv({ WHATSAPP_APP_SECRET: "s" })).toBeNull();
    expect(
      whatsappWebhookConfigFromEnv({
        WHATSAPP_APP_SECRET: "s",
        WHATSAPP_WEBHOOK_VERIFY_TOKEN: "v",
      }),
    ).toEqual({ appSecret: "s", verifyToken: "v", phoneNumberId: null });
  });

  it("waNumber quita el + y los espacios", () => {
    expect(waNumber("+57 300 123 4567")).toBe("573001234567");
  });
});
