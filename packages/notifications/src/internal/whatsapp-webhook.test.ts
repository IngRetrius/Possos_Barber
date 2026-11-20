import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  FREE_TEXT_REPLY_EVERY_MS,
  handleWebhook,
  verifySignature,
  verifySubscription,
  type InboundRecord,
  type StatusUpdate,
  type WebhookDeps,
} from "./whatsapp-webhook";
import { APPOINTMENT_ID, appointment, context, fakeClient } from "./whatsapp-test-helpers";

/*
 * Cargas con la forma exacta de los ejemplos de la documentación de Meta (Cloud API, "Webhooks":
 * status, button y text), con números de Colombia de prueba.
 */
const PHONE_NUMBER_ID = "106540352242922";
const CUSTOMER_WA = "573001234567";
const SENT_WAMID = "wamid.HBgMNTczMDAxMjM0NTY3FQIAERgSQ0I2QjM5REFBODkyQTExOEU1AA==";

function envelope(value: Record<string, unknown>, field = "messages") {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "102290129340398",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: { display_phone_number: "573110000000", phone_number_id: PHONE_NUMBER_ID },
              ...value,
            },
            field,
          },
        ],
      },
    ],
  };
}

const delivered = envelope({
  statuses: [
    {
      id: SENT_WAMID,
      status: "delivered",
      timestamp: "1763668800",
      recipient_id: CUSTOMER_WA,
      conversation: { id: "f2f0f4d1d1d3d1a5b8a0e2f3c0e5b2f0", origin: { type: "utility" } },
      pricing: { billable: true, pricing_model: "PMP", category: "utility", type: "regular" },
    },
  ],
});

const failed = envelope({
  statuses: [
    {
      id: SENT_WAMID,
      status: "failed",
      timestamp: "1763668800",
      recipient_id: CUSTOMER_WA,
      errors: [
        {
          code: 131026,
          title: "Message undeliverable",
          message: "Message undeliverable",
          error_data: { details: "Message Undeliverable." },
          href: "https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes/",
        },
      ],
    },
  ],
});

function buttonMessage(payload: string, text: string, id = "wamid.BOTON1", from = CUSTOMER_WA) {
  return envelope({
    contacts: [{ profile: { name: "Ana" }, wa_id: from }],
    messages: [
      {
        context: { from: "573110000000", id: SENT_WAMID },
        from,
        id,
        timestamp: "1763668900",
        type: "button",
        button: { payload, text },
      },
    ],
  });
}

const textMessage = (id = "wamid.TEXTO1") =>
  envelope({
    contacts: [{ profile: { name: "Ana" }, wa_id: CUSTOMER_WA }],
    messages: [
      {
        from: CUSTOMER_WA,
        id,
        timestamp: "1763668900",
        type: "text",
        text: { body: "Hola, ¿tienen cita el sábado?" },
      },
    ],
  });

function deps(patch: Partial<WebhookDeps> = {}) {
  const statuses: StatusUpdate[] = [];
  const inbound = new Map<string, InboundRecord>();
  const confirmed: string[] = [];
  const client = fakeClient();
  const d: WebhookDeps = {
    phoneNumberId: PHONE_NUMBER_ID,
    recordStatus: async (u) => {
      statuses.push(u);
      return true;
    },
    inbound: {
      claim: async (r) => {
        if (inbound.has(r.providerMessageId)) return "duplicate";
        inbound.set(r.providerMessageId, r);
        return "new";
      },
      release: async (id) => {
        inbound.delete(id);
      },
      repliedRecently: async (from, _since, except) =>
        [...inbound.values()].some(
          (r) => r.fromPhone === from && r.buttonPayload === null && r.providerMessageId !== except,
        ),
    },
    appointmentForMessage: async (wamid) => (wamid === SENT_WAMID ? APPOINTMENT_ID : null),
    appointmentForPhone: async () => APPOINTMENT_ID,
    loadAppointment: async () => appointment(),
    confirm: vi.fn(async (id: string) => {
      confirmed.push(id);
      return "ok" as const;
    }),
    client,
    context,
    now: () => new Date("2026-11-20T20:00:00Z"),
    ...patch,
  };
  return { d, statuses, inbound, confirmed, client };
}

describe("firma X-Hub-Signature-256", () => {
  const body = JSON.stringify(delivered);
  const sign = (raw: string, secret: string) =>
    `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;

  it("acepta la firma del secreto de la app sobre el cuerpo tal como llegó", () => {
    expect(verifySignature(body, sign(body, "secreto"), "secreto")).toBe(true);
    expect(verifySignature(new TextEncoder().encode(body), sign(body, "secreto"), "secreto")).toBe(
      true,
    );
  });

  it("rechaza otra firma, otro cuerpo, un encabezado mal formado o ninguno", () => {
    expect(verifySignature(body, sign(body, "otro"), "secreto")).toBe(false);
    expect(verifySignature(body + " ", sign(body, "secreto"), "secreto")).toBe(false);
    expect(verifySignature(body, "sha1=abc", "secreto")).toBe(false);
    expect(verifySignature(body, null, "secreto")).toBe(false);
    expect(verifySignature(body, sign(body, ""), "")).toBe(false);
  });
});

describe("verificación del webhook (GET de Meta)", () => {
  it("devuelve el challenge solo con el token correcto", () => {
    const ok = new URLSearchParams({
      "hub.mode": "subscribe",
      "hub.verify_token": "token-de-verificacion",
      "hub.challenge": "1158201444",
    });
    expect(verifySubscription(ok, "token-de-verificacion")).toBe("1158201444");
    ok.set("hub.verify_token", "otro");
    expect(verifySubscription(ok, "token-de-verificacion")).toBeNull();
    expect(verifySubscription(new URLSearchParams(), "token-de-verificacion")).toBeNull();
  });
});

describe("handleWebhook: estados", () => {
  it("delivered pasa al trabajo con la categoría de cobro", async () => {
    const { d, statuses } = deps();
    expect(await handleWebhook(delivered, d)).toEqual({
      ok: true,
      statuses: 1,
      messages: 0,
      duplicates: 0,
    });
    expect(statuses).toEqual([
      {
        messageId: SENT_WAMID,
        status: "delivered",
        at: "2025-11-20T20:00:00.000Z",
        error: null,
        pricingCategory: "utility",
      },
    ]);
  });

  it("failed guarda el código y el título del error", async () => {
    const { d, statuses } = deps();
    await handleWebhook(failed, d);
    expect(statuses[0]).toMatchObject({ status: "failed", error: "131026: Message undeliverable" });
  });

  it("si la base falla, pide que Meta reintente", async () => {
    const { d } = deps({ recordStatus: async () => false });
    expect((await handleWebhook(delivered, d)).ok).toBe(false);
  });

  it("ignora otros números, otros campos y cargas que no son de WhatsApp", async () => {
    const { d, statuses } = deps({ phoneNumberId: "999" });
    await handleWebhook(delivered, d);
    await handleWebhook(envelope({}, "message_template_status_update"), deps().d);
    await handleWebhook({ object: "page", entry: [] }, deps().d);
    await handleWebhook(null, deps().d);
    expect(statuses).toEqual([]);
  });
});

describe("handleWebhook: botones", () => {
  it('"Confirmo" confirma la cita por booking y contesta "Listo"', async () => {
    const { d, confirmed, client, inbound } = deps();
    const report = await handleWebhook(buttonMessage(`confirm:${APPOINTMENT_ID}`, "Confirmo"), d);
    expect(report).toMatchObject({ ok: true, messages: 1 });
    expect(confirmed).toEqual([APPOINTMENT_ID]);
    expect(client.texts).toEqual([
      {
        to: "+573001234567",
        body: "Listo, Ana. Tu cita del sábado 21 de noviembre a las 3:00 p. m. quedó confirmada. Te esperamos.",
        replyTo: "wamid.BOTON1",
      },
    ]);
    expect(inbound.get("wamid.BOTON1")).toMatchObject({
      fromPhone: "+573001234567",
      appointmentId: APPOINTMENT_ID,
      buttonPayload: `confirm:${APPOINTMENT_ID}`,
    });
  });

  it("el mismo botón dos veces (Meta reintenta) confirma y contesta una sola vez", async () => {
    const { d, confirmed, client } = deps();
    const payload = buttonMessage(`confirm:${APPOINTMENT_ID}`, "Confirmo");
    await handleWebhook(payload, d);
    const second = await handleWebhook(payload, d);
    expect(second).toMatchObject({ ok: true, duplicates: 1, messages: 0 });
    expect(confirmed).toHaveLength(1);
    expect(client.texts).toHaveLength(1);
  });

  it('"Necesito cambiarla" contesta con el enlace a la cita', async () => {
    const { d, confirmed, client } = deps();
    await handleWebhook(buttonMessage(`change:${APPOINTMENT_ID}`, "Necesito cambiarla"), d);
    expect(confirmed).toEqual([]);
    expect(client.texts[0]!.body).toBe(
      `Aquí puedes cambiar la hora o cancelar tu cita: https://possos.test/mis-citas/${APPOINTMENT_ID}`,
    );
  });

  it("sin payload, reconoce el texto del botón y busca la cita por el mensaje original", async () => {
    const { d, confirmed } = deps();
    await handleWebhook(buttonMessage("", "Confirmo"), d);
    expect(confirmed).toEqual([APPOINTMENT_ID]);
  });

  it("una cita cancelada o pasada contesta que ya no está activa", async () => {
    const { d, client } = deps({ confirm: async () => "inactive" });
    await handleWebhook(buttonMessage(`confirm:${APPOINTMENT_ID}`, "Confirmo"), d);
    expect(client.texts[0]!.body).toContain("ya no está activa");
  });

  it("un botón desde otro celular no confirma la cita", async () => {
    const { d, confirmed } = deps();
    await handleWebhook(
      buttonMessage(`confirm:${APPOINTMENT_ID}`, "Confirmo", "wamid.OTRO", "573009998877"),
      d,
    );
    expect(confirmed).toEqual([]);
  });

  it("si confirmar falla en la base, suelta el mensaje para que el reintento lo procese", async () => {
    const { d, inbound, client } = deps({ confirm: async () => "error" });
    const report = await handleWebhook(buttonMessage(`confirm:${APPOINTMENT_ID}`, "Confirmo"), d);
    expect(report.ok).toBe(false);
    expect(inbound.has("wamid.BOTON1")).toBe(false);
    expect(client.texts).toEqual([]);
  });

  it("sin token de envío, igual confirma (no contesta)", async () => {
    const { d, confirmed } = deps({ client: null });
    await handleWebhook(buttonMessage(`confirm:${APPOINTMENT_ID}`, "Confirmo"), d);
    expect(confirmed).toEqual([APPOINTMENT_ID]);
  });
});

describe("handleWebhook: texto libre", () => {
  it("contesta con el WhatsApp del barbero de su cita", async () => {
    const { d, client } = deps();
    await handleWebhook(textMessage(), d);
    expect(client.texts).toHaveLength(1);
    expect(client.texts[0]!.body).toContain("https://wa.me/573009999999");
    expect(client.texts[0]!.body).toContain("nadie lee los mensajes");
  });

  it("sin WhatsApp del barbero, el Instagram de la barbería", async () => {
    const { d, client } = deps({
      loadAppointment: async () => appointment({ barber_whatsapp_url: null }),
    });
    await handleWebhook(textMessage(), d);
    expect(client.texts[0]!.body).toContain("https://www.instagram.com/possosbarber/");
  });

  it(`no contesta otra vez antes de ${FREE_TEXT_REPLY_EVERY_MS / 3_600_000} horas`, async () => {
    const { d, client } = deps();
    await handleWebhook(textMessage("wamid.T1"), d);
    await handleWebhook(textMessage("wamid.T2"), d);
    expect(client.texts).toHaveLength(1);
  });
});
