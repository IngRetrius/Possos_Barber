import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { linkFromEmail } from "./support/mailpit";
import {
  appointmentStatus,
  availableStarts,
  bookAs,
  bookFreeSlot,
  cancelTestAppointments,
  dayWithSlots,
  myAppointments,
  rescheduledFrom,
  rpc,
  SEED,
  setBarberWhatsapp,
  setCancelWindow,
  signInApi,
} from "./support/supabase";

/*
 * F5: "Mis citas", a 390 px. Necesita Supabase local con la semilla y Realtime. Las pruebas
 * reservan horas reales: corren en serie y, antes y después de cada una, el administrador cancela
 * las citas futuras de las cuentas de prueba. La de la ventana de 2 h cambia `cancel_window_min`
 * y el WhatsApp del barbero de la semilla, y los deja como estaban al terminar.
 */

test.describe.configure({ mode: "serial" });

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const TAKEN = "Esa hora se acaba de ocupar, elige otra";
const CANCEL_WINDOW_MIN = 120;

const bottomBar = (page: Page) => page.locator('[data-slot="bottom-bar"]');
const slotLabel = (page: Page, startAt: string) =>
  page.locator('[data-slot="slot-grid"] label', {
    has: page.locator(`input[value="${startAt}"]`),
  });
const nextCard = (page: Page) =>
  page.locator("section", { has: page.getByRole("heading", { name: "Próxima cita" }) });

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

async function signIn(page: Page, email: string, next = "/") {
  await page.goto(`/ingresar?next=${encodeURIComponent(next)}`);
  await fillSignIn(page, email);
}

async function fillSignIn(page: Page, email: string) {
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(SEED.password);
  await bottomBar(page).getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL((url) => url.pathname !== "/ingresar");
}

test.beforeEach(async () => {
  await cancelTestAppointments();
});

test.afterAll(async () => {
  await cancelTestAppointments();
  await setCancelWindow(CANCEL_WINDOW_MIN);
  await setBarberWhatsapp(null);
});

test("cuenta nueva: Todavía no tienes citas y Reservar", async ({ page }) => {
  const email = `e2e-mis-citas-${Date.now()}-${Math.floor(Math.random() * 1e6)}@ejemplo.test`;
  await page.goto(`/registrarse?next=${encodeURIComponent("/mis-citas")}`);
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill("clave-de-prueba-1");
  await bottomBar(page).getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { name: "Revisa tu correo" })).toBeVisible();
  await page.goto(await linkFromEmail(email, /Confirma tu correo/));
  await page.getByLabel("Nombre").fill("Cliente de Playwright");
  await page.getByLabel("Celular").fill("3001234567");
  await page.locator("label", { hasText: "Autorizo a Possos Barber" }).tap();
  await bottomBar(page).getByRole("button", { name: "Guardar y continuar" }).click();

  await expect(page).toHaveURL("/mis-citas");
  await expect(page.getByRole("heading", { name: "Mis citas" })).toBeVisible();
  await expect(page.getByText("Todavía no tienes citas")).toBeVisible();
  await expect(page).toHaveTitle("Mis citas · Possos Barber");
  await expectAccessible(page);

  // El corte tiene adicionales: Reservar empieza en el paso Servicio.
  await page.getByRole("link", { name: "Reservar" }).click();
  await expect(page).toHaveURL("/reservar");
  await expect(page.getByRole("heading", { name: "¿Qué servicio quieres?" })).toBeVisible();
});

test("enlace directo: sin sesión pide ingresar y vuelve; otra cuenta recibe 404", async ({
  page,
  browser,
}) => {
  const day = await dayWithSlots(1);
  const { id } = await bookFreeSlot(SEED.customer, day);

  await page.goto(`/mis-citas/${id}`);
  await expect(page).toHaveURL(`/ingresar?next=${encodeURIComponent(`/mis-citas/${id}`)}`);
  await fillSignIn(page, SEED.customer);
  await expect(page).toHaveURL(`/mis-citas/${id}`);
  await expect(page.getByRole("heading", { name: "Tu cita" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancelar" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Cambiar hora" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Agregar al calendario" })).toHaveAttribute(
    "href",
    `/mis-citas/${id}/calendario`,
  );
  await expect(page).toHaveTitle("Tu cita · Possos Barber");
  await expectAccessible(page);

  // "Agregar al calendario": Android va a Google Calendar con la cita; iPhone, al .ics.
  const android = await page.request.get(`/mis-citas/${id}/calendario`, {
    headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130" },
    maxRedirects: 0,
  });
  expect(android.status()).toBe(302);
  const google = new URL(android.headers()["location"]!);
  expect(google.hostname).toBe("calendar.google.com");
  expect(google.searchParams.get("location")).toMatch(/Girardot/);
  expect(google.searchParams.get("details")).toContain(`/mis-citas/${id}`);
  const iphone = await page.request.get(`/mis-citas/${id}/calendario`, {
    headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)" },
    maxRedirects: 0,
  });
  expect(iphone.status()).toBe(302);
  expect(iphone.headers()["location"]).toBe(`/mis-citas/${id}/calendario.ics`);

  // El .ics es de la cita y lleva la dirección.
  const ics = await page.request.get(`/mis-citas/${id}/calendario.ics`);
  expect(ics.status()).toBe(200);
  const text = await ics.text();
  expect(text).toContain(`UID:${id}@possosbarber`);
  expect(text).toMatch(/LOCATION:.+Girardot/);

  // Desde el inicio: "Mis citas" arriba y la próxima cita lleva a ella.
  await page.goto("/");
  await page.getByRole("link", { name: /Tu próxima cita/ }).click();
  await expect(page).toHaveURL(`/mis-citas/${id}`);
  await page.goto("/");
  await page.getByRole("link", { name: "Mis citas", exact: true }).click();
  await expect(page).toHaveURL("/mis-citas");

  // Otra cuenta: 404, sin datos de la cita ni del cliente.
  const other = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const otherPage = await other.newPage();
  await signIn(otherPage, SEED.customer2);
  for (const path of [`/mis-citas/${id}`, `/mis-citas/${id}/cambiar`]) {
    const response = await otherPage.goto(path);
    expect(response?.status()).toBe(404);
    await expect(otherPage.getByRole("heading", { name: "Tu cita" })).toHaveCount(0);
  }
  const otherIcs = await otherPage.request.get(`/mis-citas/${id}/calendario.ics`);
  expect(otherIcs.status()).toBe(404);
  const otherGoogle = await otherPage.request.get(`/mis-citas/${id}/calendario`, {
    headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130" },
    maxRedirects: 0,
  });
  expect(otherGoogle.status()).toBe(404);
  await other.close();

  // El personal va a la cita en su panel.
  const staff = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const staffPage = await staff.newPage();
  await signIn(staffPage, SEED.admin, "/panel");
  await staffPage.goto(`/mis-citas/${id}`);
  await expect(staffPage).toHaveURL(`/panel?cita=${id}`);
  await staff.close();
});

test("cancelar a más de 2 h deja la hora libre otra vez", async ({ page }) => {
  const day = await dayWithSlots(1);
  const { id, startAt } = await bookFreeSlot(SEED.customer, day);
  expect(await availableStarts(day)).not.toContain(startAt);

  await signIn(page, SEED.customer, "/mis-citas");
  await expect(page).toHaveURL("/mis-citas");
  await expect(nextCard(page)).toBeVisible();
  await expectAccessible(page);

  await nextCard(page).getByRole("button", { name: "Cancelar" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("heading", { name: /^¿Cancelar tu cita del / })).toBeVisible();
  await expectAccessible(page);
  await sheet.getByRole("button", { name: "Sí, cancelar" }).click();

  await expect(page.getByText("Cancelaste tu cita")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(nextCard(page)).toHaveCount(0);
  await expect(page).toHaveURL("/mis-citas");
  expect(await appointmentStatus(SEED.customer, id)).toBe("cancelled");

  // La hora vuelve a aparecer en el flujo de reserva.
  expect(await availableStarts(day)).toContain(startAt);
  await page.goto(
    `/reservar/horario?servicio=${SEED.serviceId}&barbero=${SEED.barberId}&fecha=${day}`,
  );
  await expect(slotLabel(page, startAt)).toBeVisible();

  // Al volver a "Mis citas", la cita ya no está como próxima.
  await page.goto("/mis-citas");
  await expect(nextCard(page)).toHaveCount(0);
});

test("a menos del límite no hay botones y la base responde TOO_LATE_TO_CANCEL", async ({
  page,
}) => {
  const day = await dayWithSlots(1);
  const { id } = await bookFreeSlot(SEED.customer, day);
  try {
    // Un límite de 60 días deja cualquier cita de la ventana "a menos del límite".
    await setCancelWindow(60 * 24 * 60);
    await signIn(page, SEED.customer, `/mis-citas/${id}`);
    await expect(page.getByText("Ya no puedes cambiarla desde aquí.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancelar" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Cambiar hora" })).toHaveCount(0);
    // Sin WhatsApp del barbero, no hay un botón roto: el Instagram de la barbería.
    await expect(page.getByRole("link", { name: "Escríbele al barbero" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Escríbele por Instagram" })).toHaveAttribute(
      "href",
      "https://www.instagram.com/possosbarber/",
    );

    // Por fuera de la interfaz, la base dice que no.
    const token = await signInApi(SEED.customer);
    await expect(rpc("cancel_appointment", { p_id: id }, token)).rejects.toThrow(
      /TOO_LATE_TO_CANCEL/,
    );
    await expect(
      rpc(
        "reschedule_appointment",
        { p_id: id, p_new_start_at: new Date(Date.now() + 5 * 86_400_000).toISOString() },
        token,
      ),
    ).rejects.toThrow(/TOO_LATE_TO_CANCEL/);
    expect(await appointmentStatus(SEED.customer, id)).toBe("booked");

    // "Cambiar hora" por URL vuelve a la cita.
    await page.goto(`/mis-citas/${id}/cambiar`);
    await expect(page).toHaveURL(`/mis-citas/${id}`);

    // Con el WhatsApp del barbero, "Escríbele al barbero" lleva a su chat.
    await setBarberWhatsapp("https://wa.me/573000000000");
    await page.reload();
    await expect(
      page.getByText("Ya no puedes cambiarla desde aquí. Escríbele al barbero"),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Escríbele al barbero" })).toHaveAttribute(
      "href",
      "https://wa.me/573000000000",
    );
    await expectAccessible(page);
  } finally {
    await setCancelWindow(CANCEL_WINDOW_MIN);
    await setBarberWhatsapp(null);
  }
});

test("cambiar la hora deja una sola cita activa, enlazada con la anterior", async ({ page }) => {
  const day = await dayWithSlots(3);
  const { id, startAt } = await bookFreeSlot(SEED.customer, day);
  const newStart = (await availableStarts(day)).find((s) => s !== startAt)!;

  await signIn(page, SEED.customer, "/mis-citas");
  await nextCard(page).getByRole("link", { name: "Cambiar hora" }).click();
  await expect(page).toHaveURL(new RegExp(`/mis-citas/${id}/cambiar`));
  await expect(page.getByRole("heading", { name: "Elige la nueva hora" })).toBeVisible();
  await expect(page.getByText("Paso 1 de 2")).toBeVisible();

  // El día de la cita; la hora actual no aparece (la ocupa la misma cita).
  await page.goto(`/mis-citas/${id}/cambiar?fecha=${day}`);
  await expect(slotLabel(page, newStart)).toBeVisible();
  await expect(slotLabel(page, startAt)).toHaveCount(0);
  await expectAccessible(page);
  await slotLabel(page, newStart).tap();
  await bottomBar(page).getByRole("link", { name: "Continuar" }).click();

  await expect(page).toHaveURL(new RegExp(`/mis-citas/${id}/cambiar/confirmar\\?`));
  await expect(page.getByRole("heading", { name: "Revisa el cambio" })).toBeVisible();
  await expect(page.getByText(/^Antes: /)).toBeVisible();
  await expectAccessible(page);
  await bottomBar(page).getByRole("button", { name: "Cambiar la hora" }).click();

  await expect(page.getByText("Cambiamos tu cita")).toBeVisible();
  await expect(page).toHaveURL(/\/mis-citas\/[0-9a-f-]{36}$/);
  const newId = page.url().split("/").pop()!;
  expect(newId).not.toBe(id);

  expect(await appointmentStatus(SEED.customer, id)).toBe("cancelled");
  expect(await rescheduledFrom(SEED.customer, newId)).toBe(id);
  const active = (await myAppointments(SEED.customer)).filter((a) =>
    ["pending_approval", "booked", "confirmed"].includes(a.status),
  );
  expect(active.map((a) => a.id)).toEqual([newId]);
  expect(new Date(active[0]!.start_at).toISOString()).toBe(newStart);
  // La hora de antes quedó libre.
  expect(await availableStarts(day)).toContain(startAt);

  // El enlace de la cita vieja (un WhatsApp anterior) lleva a la nueva.
  await page.goto(`/mis-citas/${id}`);
  await expect(page).toHaveURL(`/mis-citas/${newId}`);
});

test("si la hora nueva se ocupó, la cita original queda igual", async ({ page }) => {
  const day = await dayWithSlots(3);
  const { id, startAt } = await bookFreeSlot(SEED.customer, day);
  const newStart = (await availableStarts(day)).find((s) => s !== startAt)!;

  await signIn(
    page,
    SEED.customer,
    `/mis-citas/${id}/cambiar/confirmar?fecha=${day}&hora=${encodeURIComponent(newStart)}`,
  );
  await expect(page.getByRole("heading", { name: "Revisa el cambio" })).toBeVisible();

  // Otra persona toma la hora mientras el cliente mira el resumen.
  await bookAs(SEED.customer2, newStart);
  await bottomBar(page).getByRole("button", { name: "Cambiar la hora" }).click();

  await expect(page).toHaveURL(new RegExp(`/mis-citas/${id}/cambiar\\?fecha=${day}`));
  await expect(bottomBar(page)).toContainText(TAKEN);
  expect(await appointmentStatus(SEED.customer, id)).toBe("booked");
  const active = (await myAppointments(SEED.customer)).filter((a) =>
    ["pending_approval", "booked", "confirmed"].includes(a.status),
  );
  expect(active.map((a) => a.id)).toEqual([id]);
});

test("volver a reservar llega al horario sin preguntar servicio ni barbero", async ({ page }) => {
  // Una cita cancelada queda en el historial.
  const day = await dayWithSlots(1);
  await bookFreeSlot(SEED.customer, day);
  await cancelTestAppointments();

  await signIn(page, SEED.customer, "/mis-citas");
  const history = page.locator("section", {
    has: page.getByRole("heading", { name: "Citas pasadas" }),
  });
  await expect(history.getByText("Cancelada").first()).toBeVisible();
  await expectAccessible(page);
  await history
    .getByRole("link", { name: /^Volver a reservar/ })
    .first()
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/reservar/horario\\?servicio=${SEED.serviceId}&barbero=${SEED.barberId}`),
  );
  await expect(page.getByRole("heading", { name: "Elige tu hora" })).toBeVisible();
});
