import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import {
  bookFreeSlot,
  cancelTestAppointments,
  dayWithSlots,
  dispatchSecret,
  SEED,
} from "./support/supabase";
import {
  signed,
  startFakeGraph,
  webhookPayload,
  whatsappEnv,
  type SentMessage,
} from "./support/whatsapp";
import { settleAnimations } from "./support/animations";

/*
 * F7: recordatorios por WhatsApp sin Meta, a 390 px. La app manda a una Graph API falsa
 * (WHATSAPP_API_URL) y el webhook recibe cargas firmadas como las de Meta. Cubre: la verificación
 * del webhook, la confirmación al reservar, "Confirmo" con la agenda en vivo, un reintento de Meta
 * sin duplicados, un número que falla marcado en la agenda, el costo del mes en "Más" y la casilla
 * del aviso de cancelación. Reserva horas reales: en serie y con la limpieza de siempre.
 */

test.describe.configure({ mode: "serial" });

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const CUSTOMER_WA = "573000000001"; // cliente@ejemplo.test en la semilla, con WhatsApp aceptado

const bottomBar = (page: Page) => page.locator('[data-slot="bottom-bar"]');
const agenda = (page: Page) => page.getByRole("list", { name: "Agenda del día" });
const sheet = (page: Page) => page.getByRole("dialog");

let graph: Awaited<ReturnType<typeof startFakeGraph>>;

test.beforeAll(async () => {
  graph = await startFakeGraph();
  await cancelTestAppointments();
});

test.afterAll(async () => {
  await cancelTestAppointments();
  await graph?.close();
});

async function expectAccessible(page: Page) {
  await settleAnimations(page);
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(
    results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`),
  ).toEqual([]);
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

async function signIn(page: Page, email: string, next: string) {
  await page.goto(`/ingresar?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(SEED.password);
  await bottomBar(page).getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL((url) => url.pathname !== "/ingresar");
}

/** Marca en `window.__postgres` los canales con Postgres Changes suscritos (como panel.spec). */
function trackPostgresChanges(page: Page) {
  page.on("websocket", (ws) => {
    ws.on("framereceived", (frame) => {
      if (typeof frame.payload !== "string" || !frame.payload.startsWith("[")) return;
      try {
        const [, , topic, event, payload] = JSON.parse(frame.payload) as [
          unknown,
          unknown,
          string,
          string,
          { status?: string; extension?: string },
        ];
        if (
          event === "system" &&
          payload?.status === "ok" &&
          payload.extension === "postgres_changes"
        ) {
          void page
            .evaluate((t) => {
              const w = window as unknown as { __postgres?: string[] };
              w.__postgres = [...(w.__postgres ?? []), t];
            }, topic)
            .catch(() => {});
        }
      } catch {
        // Otro tipo de mensaje.
      }
    });
  });
}

async function waitForLiveAgenda(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(
          (topic) => (window as unknown as { __postgres?: string[] }).__postgres?.includes(topic),
          `realtime:agenda:${SEED.barberId}`,
        ),
      { timeout: 15_000 },
    )
    .toBe(true);
}

/** Los mensajes de plantilla que la app le mandó a la Graph API falsa por una cita. */
function templatesFor(appointmentId: string, name: string): SentMessage[] {
  return graph.sent.filter(
    (m) => m.template?.name === name && JSON.stringify(m.template).includes(appointmentId),
  );
}

/**
 * Pide despachos hasta que salga la confirmación de la cita. La base también los pide sola (pg_net);
 * después de `pnpm db:test` el cursor puede esperar hasta 2 minutos ante un hueco de ids (F8).
 */
async function waitForConfirmation(request: APIRequestContext, appointmentId: string) {
  await expect
    .poll(
      async () => {
        await request.post("/api/notifications/dispatch", {
          headers: { Authorization: `Bearer ${dispatchSecret()}` },
        });
        return templatesFor(appointmentId, "cita_confirmada").length;
      },
      { timeout: 150_000, intervals: [1_000, 2_000, 5_000] },
    )
    .toBeGreaterThan(0);
  return templatesFor(appointmentId, "cita_confirmada")[0]!;
}

const unix = () => String(Math.floor(Date.now() / 1000));

test("el webhook verifica el token de Meta y rechaza firmas inválidas", async ({ request }) => {
  const { verifyToken } = whatsappEnv();
  const query = (token: string) =>
    `/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(token)}&hub.challenge=1158201444`;

  expect((await request.get(query("otro-token"))).status()).toBe(403);
  const verified = await request.get(query(verifyToken));
  expect(verified.status()).toBe(200);
  expect(await verified.text()).toBe("1158201444");

  const payload = webhookPayload({ statuses: [] });
  const unsigned = await request.post("/api/whatsapp/webhook", {
    data: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });
  expect(unsigned.status()).toBe(401);
  const wrong = await request.post("/api/whatsapp/webhook", signed(payload, "otro-secreto"));
  expect(wrong.status()).toBe(401);
  expect((await request.post("/api/whatsapp/webhook", signed(payload))).status()).toBe(200);
});

test('una reserva recibe la confirmación y "Confirmo" la confirma sin recargar la agenda', async ({
  page,
  request,
}) => {
  test.setTimeout(240_000);
  trackPostgresChanges(page);
  const day = await dayWithSlots(2);
  await signIn(page, SEED.admin, `/panel?dia=${day}`);
  await expect(agenda(page)).toBeVisible();
  await waitForLiveAgenda(page);

  const { id } = await bookFreeSlot(SEED.customer, day);
  const confirmation = await waitForConfirmation(request, id);
  expect(confirmation.to).toBe(CUSTOMER_WA);
  expect(confirmation.template!.components[0]!.parameters[0]!.text).toBe("Cliente");

  // Otro despacho no la vuelve a mandar.
  await request.post("/api/notifications/dispatch", {
    headers: { Authorization: `Bearer ${dispatchSecret()}` },
  });
  expect(templatesFor(id, "cita_confirmada")).toHaveLength(1);

  // Meta avisa que se entregó.
  const delivered = await request.post(
    "/api/whatsapp/webhook",
    signed(
      webhookPayload({
        statuses: [
          {
            id: confirmation.messageId,
            status: "delivered",
            timestamp: unix(),
            recipient_id: CUSTOMER_WA,
            pricing: { billable: true, pricing_model: "PMP", category: "utility", type: "regular" },
          },
        ],
      }),
    ),
  );
  expect(delivered.status()).toBe(200);

  // El cliente toca "Confirmo" (respuesta a un recordatorio_24h).
  const buttonId = `wamid.E2EBOTON${Date.now()}`;
  const button = webhookPayload({
    contacts: [{ profile: { name: "Cliente" }, wa_id: CUSTOMER_WA }],
    messages: [
      {
        context: { from: "573110000000", id: confirmation.messageId },
        from: CUSTOMER_WA,
        id: buttonId,
        timestamp: unix(),
        type: "button",
        button: { payload: `confirm:${id}`, text: "Confirmo" },
      },
    ],
  });
  const pressed = await request.post("/api/whatsapp/webhook", signed(button));
  expect(pressed.status()).toBe(200);
  expect(await pressed.json()).toMatchObject({ ok: true, messages: 1 });

  const row = agenda(page).getByRole("button", { name: /Cliente de prueba/ });
  await expect(row).toContainText("Confirmada", { timeout: 5_000 });
  const reply = graph.sent.find((m) => m.context?.message_id === buttonId);
  expect(reply?.text?.body).toContain("quedó confirmada");

  // Meta reintenta el mismo mensaje: no se confirma ni se contesta otra vez.
  const again = await request.post("/api/whatsapp/webhook", signed(button));
  expect(await again.json()).toMatchObject({ ok: true, duplicates: 1, messages: 0 });
  expect(graph.sent.filter((m) => m.context?.message_id === buttonId)).toHaveLength(1);

  await page.reload();
  await row.click();
  await expect(sheet(page).getByText("Confirmación entregada")).toBeVisible();
  await expectAccessible(page);
});

test("un número que falla se marca en la agenda y en la hoja de la cita", async ({
  page,
  request,
}) => {
  test.setTimeout(240_000);
  // Sin la cita de la prueba anterior: así la fila del cliente es una sola.
  await cancelTestAppointments();
  const day = await dayWithSlots(2);
  const { id } = await bookFreeSlot(SEED.customer, day);
  const confirmation = await waitForConfirmation(request, id);

  const failed = await request.post(
    "/api/whatsapp/webhook",
    signed(
      webhookPayload({
        statuses: [
          {
            id: confirmation.messageId,
            status: "failed",
            timestamp: unix(),
            recipient_id: CUSTOMER_WA,
            errors: [
              { code: 131026, title: "Message undeliverable", message: "Message undeliverable" },
            ],
          },
        ],
      }),
    ),
  );
  expect(failed.status()).toBe(200);

  await signIn(page, SEED.admin, `/panel?dia=${day}`);
  const row = agenda(page).getByRole("button", { name: /Cliente de prueba/ });
  await expect(row).toContainText("El recordatorio falló");
  await row.click();
  await expect(sheet(page).getByText("La confirmación falló: revisa el número")).toBeVisible();
  await expectAccessible(page);
});

test('"Más" muestra el costo de WhatsApp del mes y "Configuración" el aviso de cancelación', async ({
  page,
}) => {
  await signIn(page, SEED.admin, "/panel/mas");
  const section = page.getByRole("region", { name: "WhatsApp" });
  await expect(section).toBeVisible();
  await expect(section).toContainText(/: unos \$/);
  await expect(section).toContainText(/entregados?/);
  await expect(section).toContainText("tarifa de Meta para Colombia");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expectAccessible(page);

  await page.goto("/panel/configuracion");
  await expect(
    page.getByText("Salen por WhatsApp a los clientes que lo aceptaron.", { exact: false }),
  ).toBeVisible();
  const cancellation = page.getByLabel("Avisar al cliente cuando el personal cancela su cita");
  await expect(cancellation).not.toBeChecked();
  await expect(
    page.getByText("Actívalo cuando Meta apruebe la plantilla cita_cancelada."),
  ).toBeVisible();
});
