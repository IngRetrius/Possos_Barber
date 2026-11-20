import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { linkFromEmail } from "./support/mailpit";
import {
  appointmentStatus,
  availableDays,
  availableStarts,
  bookAs,
  cancelTestAppointments,
  dayWithSlots,
  SEED,
} from "./support/supabase";

/*
 * F4: página pública y flujo de reserva, a 390 px. Necesita Supabase local con la semilla y
 * Realtime (avisos de Broadcast). Las pruebas reservan horas reales, así que corren en serie y
 * al final el administrador cancela las citas de las cuentas de prueba.
 */

test.describe.configure({ mode: "serial" });

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const TAKEN = "Esa hora se acaba de ocupar, elige otra";
const TIME_PATH = "/reservar/horario";
const CONFIRM_PATH = "/reservar/confirmar";

const bottomBar = (page: Page) => page.locator('[data-slot="bottom-bar"]');
const slotLabel = (page: Page, startAt: string) =>
  page.locator('[data-slot="slot-grid"] label', {
    has: page.locator(`input[value="${startAt}"]`),
  });

async function expectAccessible(page: Page) {
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

function timeUrl(day: string) {
  return `${TIME_PATH}?servicio=${SEED.serviceId}&barbero=${SEED.barberId}&fecha=${day}`;
}

function confirmUrl(day: string, startAt: string) {
  return `${CONFIRM_PATH}?servicio=${SEED.serviceId}&barbero=${SEED.barberId}&fecha=${day}&hora=${encodeURIComponent(startAt)}`;
}

async function signIn(page: Page, email: string, next = "/") {
  await page.goto(`/ingresar?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(SEED.password);
  await bottomBar(page).getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL((url) => url.pathname !== "/ingresar");
}

/** Espera a que la página esté suscrita al canal de horas de ese día (Broadcast). */
async function waitForSlotsChannel(page: Page, day: string) {
  await expect
    .poll(
      () =>
        page.evaluate(
          (topic) => (window as unknown as { __channels?: string[] }).__channels?.includes(topic),
          `realtime:slots:${SEED.barberId}:${day}`,
        ),
      { timeout: 15_000 },
    )
    .toBe(true);
}

/**
 * Registra en `window.__channels` los canales de Realtime a los que la página se unió. El
 * cliente de Realtime usa mensajes en arreglo: `[join_ref, ref, topic, event, payload]`.
 */
async function trackChannels(page: Page) {
  page.on("websocket", (ws) => {
    ws.on("framereceived", (frame) => {
      if (typeof frame.payload !== "string" || !frame.payload.startsWith("[")) return;
      try {
        const [, , topic, event, payload] = JSON.parse(frame.payload) as [
          unknown,
          unknown,
          string,
          string,
          { status?: string },
        ];
        if (
          event === "phx_reply" &&
          payload?.status === "ok" &&
          topic.startsWith("realtime:slots:")
        ) {
          void page
            .evaluate((t) => {
              const w = window as unknown as { __channels?: string[] };
              w.__channels = [...(w.__channels ?? []), t];
            }, topic)
            .catch(() => {});
        }
      } catch {
        // Otro tipo de mensaje.
      }
    });
  });
}

test.beforeAll(async () => {
  await cancelTestAppointments();
});

test.afterAll(async () => {
  await cancelTestAppointments();
});

test("la página pública se lee sin JavaScript", async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Possos Barber", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Servicios" })).toBeVisible();
  await expect(page.getByText("Corte normal")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Horario" })).toBeVisible();
  await expect(page.getByText("Lunes a sábado")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ubicación" })).toBeVisible();
  await expect(page.getByText("Girardot, Cundinamarca")).toBeVisible();
  await expect(page.getByRole("link", { name: "Reservar" })).toBeVisible();

  const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
  expect(JSON.parse(jsonLd ?? "{}")).toMatchObject({
    "@type": "BarberShop",
    name: "Possos Barber",
    address: { addressLocality: "Girardot" },
  });
  await context.close();
});

test("un servicio del inicio se despliega y reserva directo, también sin JavaScript", async ({
  browser,
}) => {
  for (const javaScriptEnabled of [true, false]) {
    const context = await browser.newContext({
      javaScriptEnabled,
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await page.goto("/");
    const services = page.locator('section[aria-labelledby="servicios"]');
    const book = services.getByRole("link", { name: "Reservar este servicio" });
    await expect(book).toBeHidden();
    await services.locator("summary", { hasText: "Corte normal" }).click();
    await expect(book).toBeVisible();
    if (javaScriptEnabled) await expectAccessible(page);
    await book.click();
    await expect(page).toHaveURL(new RegExp(`^[^?]+${TIME_PATH}\\?.*servicio=${SEED.serviceId}`));
    await context.close();
  }
});

test("cliente con sesión reserva en 4 toques desde el inicio", async ({ page }) => {
  await signIn(page, SEED.customer, "/");
  await expect(page).toHaveURL("/");
  await expectAccessible(page);

  // 1. Reservar: con un servicio y un barbero, el flujo empieza en el horario.
  await bottomBar(page).getByRole("link", { name: "Reservar" }).tap();
  await expect(page).toHaveURL(new RegExp(`^[^?]+${TIME_PATH}\\?`));
  await expect(page.getByText("Paso 1 de 2")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Elige tu hora" })).toBeVisible();
  await expectAccessible(page);

  // La primera hora libre del día que se muestra (hoy, o el primer día con horas).
  const firstSlot = page.locator('[data-slot="slot-grid"] input').first();
  const startAt = await firstSlot.getAttribute("value");

  // 2. Una hora.
  await slotLabel(page, startAt!).tap();
  await expect(bottomBar(page)).toContainText(/\d{1,2}:\d{2}\s(a|p)\.\sm\./);
  await expect(page).toHaveURL(/hora=/);

  // 3. Continuar.
  await bottomBar(page).getByRole("link", { name: "Continuar" }).tap();
  await expect(page).toHaveURL(/\/reservar\/confirmar\?/);
  await expect(page.getByText("Paso 2 de 2")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Revisa tu cita" })).toBeVisible();
  await expect(
    page.getByText("Puedes cancelar o cambiar tu cita hasta 2 horas antes."),
  ).toBeVisible();
  await expect(page.getByText("Total en la barbería")).toBeVisible();
  await expectAccessible(page);

  // 4. Reservar.
  await bottomBar(page).getByRole("button", { name: "Reservar" }).tap();
  await expect(page).toHaveURL(/\/reservar\/listo\?cita=/);
  await expect(page.getByRole("heading", { name: "Tu cita quedó reservada" })).toBeVisible();
  await expectAccessible(page);

  // Agregar al calendario.
  const href = await page.getByRole("link", { name: "Agregar al calendario" }).getAttribute("href");
  const ics = await page.request.get(href!, {
    headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)" },
  });
  expect(ics.headers()["content-type"]).toContain("text/calendar");
  const body = await ics.text();
  expect(body).toContain("BEGIN:VCALENDAR");
  expect(body).toContain(`DTSTART:${startAt!.replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`);

  // La cita próxima aparece primero en el inicio.
  await page.goto("/");
  await expect(page.getByText("Tu próxima cita")).toBeVisible();
  await expect(page.getByText("Sin confirmar")).toBeVisible();
});

test("la hora que toma otro desaparece sin recargar y no se ven datos de otros", async ({
  page,
}) => {
  const bodies: string[] = [];
  page.on("response", async (response) => {
    const type = response.headers()["content-type"] ?? "";
    if (/html|json|x-component|text\/plain/.test(type)) {
      bodies.push(await response.text().catch(() => ""));
    }
  });
  await trackChannels(page);

  await signIn(page, SEED.customer, "/");
  const day = await dayWithSlots(3);
  const [first, second] = await availableStarts(day);

  await page.goto(timeUrl(day));
  await waitForSlotsChannel(page, day);
  await slotLabel(page, first!).tap();
  await expect(bottomBar(page).getByRole("link", { name: "Continuar" })).toBeVisible();

  // Otra persona (otra cuenta, otro "navegador") reserva la misma hora.
  await bookAs(SEED.customer2, first!);

  await expect(bottomBar(page)).toContainText(TAKEN);
  await expect(slotLabel(page, first!)).toHaveCount(0);
  await expect(bottomBar(page).getByRole("button", { name: "Continuar" })).toBeDisabled();
  await expectAccessible(page);

  // En "Confirmar" con la hora libre, y otra persona la toma justo antes de "Reservar".
  await page.goto(confirmUrl(day, second!));
  await expect(page.getByRole("heading", { name: "Revisa tu cita" })).toBeVisible();
  await bookAs(SEED.customer2, second!);
  await bottomBar(page).getByRole("button", { name: "Reservar" }).tap();
  await expect(page).toHaveURL(/\/reservar\/horario\?.*aviso=ocupada/);
  await expect(bottomBar(page)).toContainText(TAKEN);

  // Ninguna respuesta al navegador trae datos de otros clientes.
  const all = bodies.join("\n");
  for (const secret of [
    "Cliente dos de prueba",
    "+573000000003",
    SEED.customer2,
    "Cliente con aprobación",
  ]) {
    expect(all).not.toContain(secret);
  }
});

test("sin sesión: elige hora, se registra con correo y vuelve al resumen", async ({ page }) => {
  const day = await dayWithSlots();
  const [startAt] = await availableStarts(day);
  const email = `e2e-reserva-${Date.now()}-${Math.floor(Math.random() * 1e6)}@ejemplo.test`;

  await page.goto(timeUrl(day));
  await slotLabel(page, startAt!).tap();
  await bottomBar(page).getByRole("link", { name: "Continuar" }).tap();
  await expect(page.getByRole("heading", { name: "Para reservar, ingresa" })).toBeVisible();
  // Sin sesión no hay barra inferior: los botones de cuenta ocupan su lugar.
  await expect(bottomBar(page)).toHaveCount(0);
  const summary = await page.getByRole("region", { name: "Resumen de la cita" }).textContent();
  await expectAccessible(page);

  await page.getByRole("link", { name: "Usar mi correo" }).tap();
  await expect(page).toHaveURL(/\/ingresar\?next=/);
  await page.getByRole("link", { name: "Crea una" }).tap();
  await expect(page.getByRole("heading", { name: "Crea tu cuenta" })).toBeVisible();
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill("clave-de-prueba-1");
  await bottomBar(page).getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { name: "Revisa tu correo" })).toBeVisible();

  await page.goto(await linkFromEmail(email, /Confirma tu correo/));
  await expect(page).toHaveURL(/\/completar-perfil\?next=/);
  await page.getByLabel("Nombre").fill("Cliente de Playwright");
  await page.getByLabel("Celular").fill("3001234567");
  await page.locator("label", { hasText: "Autorizo a Possos Barber" }).tap();
  await bottomBar(page).getByRole("button", { name: "Guardar y continuar" }).click();

  // De vuelta en "Confirmar" con la misma hora.
  await expect(page).toHaveURL(
    new RegExp(`/reservar/confirmar\\?.*hora=${encodeURIComponent(startAt!)}`),
  );
  await expect(page.getByRole("region", { name: "Resumen de la cita" })).toHaveText(summary!);
  await bottomBar(page).getByRole("button", { name: "Reservar" }).tap();
  await expect(page.getByRole("heading", { name: "Tu cita quedó reservada" })).toBeVisible();
});

test("cliente con 2 inasistencias ve el aviso y su cita queda pendiente", async ({ page }) => {
  const day = await dayWithSlots();
  const [startAt] = await availableStarts(day);
  await signIn(page, SEED.approval, confirmUrl(day, startAt!));

  await expect(page).toHaveURL(/\/reservar\/confirmar\?/);
  await expect(
    page.getByText("Tu reserva queda pendiente de que el barbero la apruebe"),
  ).toBeVisible();
  await bottomBar(page).getByRole("button", { name: "Reservar" }).tap();
  await expect(page.getByRole("heading", { name: "Tu reserva quedó pendiente" })).toBeVisible();

  const id = new URL(page.url()).searchParams.get("cita")!;
  expect(await appointmentStatus(SEED.approval, id)).toBe("pending_approval");
});

test("día sin horas: ver la próxima hora libre", async ({ page }) => {
  const days = await availableDays();
  const empty = days
    .slice(1)
    .find((d) => d.slots === 0 && days.some((n) => n.day > d.day && n.slots > 0));
  test.skip(!empty, "La semilla no tiene un día sin horas en la ventana");

  await page.goto(timeUrl(empty!.day));
  await expect(page.getByText("no tiene horas libres")).toBeVisible();
  await expect(bottomBar(page).getByRole("button", { name: "Continuar" })).toBeDisabled();
  await page.getByRole("button", { name: "Ver la próxima hora libre" }).tap();

  const next = days.find((d) => d.day > empty!.day && d.slots > 0)!.day;
  await expect(page).toHaveURL(new RegExp(`fecha=${next}`));
  await expect(page.locator('[data-slot="slot-grid"]')).toBeVisible();
});

test("el botón atrás del navegador recorre los pasos en orden", async ({ page }) => {
  const day = await dayWithSlots();
  const [startAt] = await availableStarts(day);

  await page.goto("/");
  await bottomBar(page).getByRole("link", { name: "Reservar" }).tap();
  await expect(page.getByRole("heading", { name: "Elige tu hora" })).toBeVisible();
  // Cambiar de día no agrega pasos al historial.
  await page
    .locator('[data-slot="date-strip"] label', { has: page.locator(`input[value="${day}"]`) })
    .tap();
  await expect(slotLabel(page, startAt!)).toBeVisible();
  await slotLabel(page, startAt!).tap();
  await bottomBar(page).getByRole("link", { name: "Continuar" }).tap();
  await expect(page.getByRole("heading", { name: "Revisa tu cita" })).toBeVisible();

  await page.goBack();
  await expect(page.getByRole("heading", { name: "Elige tu hora" })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`fecha=${day}.*hora=`));
  await expect(slotLabel(page, startAt!).locator("input")).toBeChecked();

  await page.goBack();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Possos Barber", level: 1 })).toBeVisible();
});
