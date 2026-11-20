import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  bookFreeSlot,
  cancelTestAppointments,
  dayWithSlots,
  dispatchSecret,
  SEED,
} from "./support/supabase";
import { settleAnimations } from "./support/animations";

/*
 * F8: la PWA a 390 px. Manifiesto, service worker, "Mis citas" sin conexión, lo guardado se borra
 * al cerrar sesión (regla 7), la sección "Avisos" de "Más" y la ruta de despacho. Corre con el
 * service worker permitido (en las demás pruebas está bloqueado). Reserva horas reales: en serie
 * y con la limpieza de siempre.
 *
 * Con `next dev` el worker no precarga los archivos del build: sin conexión, la página guardada
 * se ve (es HTML del servidor) pero no se hidrata. La prueba revisa el contenido, no los botones.
 */

test.describe.configure({ mode: "serial" });
test.use({ serviceWorkers: "allow" });

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const PRIVATE_CACHE = "possos-privado";

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

async function signIn(page: Page, email: string, next = "/") {
  await page.goto(`/ingresar?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(SEED.password);
  await page.locator('[data-slot="bottom-bar"]').getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL((url) => url.pathname !== "/ingresar");
}

/** Espera a que el service worker controle la página (clientsClaim al activarse). */
async function waitForServiceWorker(page: Page) {
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, {
    timeout: 30_000,
  });
}

async function cachedPaths(page: Page): Promise<string[]> {
  return page.evaluate(async (name) => {
    if (!(await caches.has(name))) return [];
    const keys = await (await caches.open(name)).keys();
    return keys.map((request) => new URL(request.url).pathname);
  }, PRIVATE_CACHE);
}

test.beforeEach(async () => {
  await cancelTestAppointments();
});

test.afterAll(async () => {
  await cancelTestAppointments();
});

test("el manifiesto y el service worker se registran", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({
    name: "Possos Barber",
    display: "standalone",
    start_url: "/",
    lang: "es-CO",
  });
  // Los dos colores salen de `colors.bg` de @possos/ui, igual que el theme-color de la página.
  const themeColor = await page.locator('meta[name="theme-color"]').getAttribute("content");
  expect(themeColor).toBeTruthy();
  expect(manifest.theme_color).toBe(themeColor);
  expect(manifest.background_color).toBe(themeColor);
  expect(manifest.icons.map((i: { purpose: string }) => i.purpose)).toContain("maskable");

  await waitForServiceWorker(page);
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(new URL(scope).pathname).toBe("/");
  // La pantalla sin conexión queda guardada al instalarse.
  expect(await page.evaluate(async () => Boolean(await caches.match("/sin-conexion")))).toBe(true);
});

test("Mis citas se ve sin conexión; reservar no", async ({ page, context }) => {
  const { id } = await bookFreeSlot(SEED.customer, await dayWithSlots(1));
  await signIn(page, SEED.customer, "/mis-citas");
  await expect(page.getByRole("heading", { name: "Mis citas", level: 1 })).toBeVisible();
  await waitForServiceWorker(page);

  // La lista y la cita próxima quedan guardadas sin haber abierto la cita.
  await expect
    .poll(() => cachedPaths(page))
    .toEqual(expect.arrayContaining(["/mis-citas", `/mis-citas/${id}`]));

  await context.setOffline(true);
  try {
    await page.reload();
    await expect(page.getByRole("heading", { name: "Mis citas", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Próxima cita" })).toBeVisible();

    await page.goto(`/mis-citas/${id}`);
    await expect(page.getByRole("heading", { name: "Tu cita" })).toBeVisible();

    // Lo que no está guardado (las horas libres, reservar) muestra la pantalla sin conexión.
    await page.goto("/reservar");
    await expect(page.getByRole("heading", { name: "Sin conexión" })).toBeVisible();
    await expect(
      page.getByText("Para ver las horas libres, reservar, cambiar o cancelar"),
    ).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});

test("al cerrar sesión se borra lo guardado para sin conexión", async ({ page, context }) => {
  await bookFreeSlot(SEED.customer, await dayWithSlots(1));
  await signIn(page, SEED.customer, "/mis-citas");
  await waitForServiceWorker(page);
  await expect.poll(() => cachedPaths(page)).toContain("/mis-citas");

  await page.goto("/perfil");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL("/ingresar");
  await expect.poll(() => cachedPaths(page)).toEqual([]);

  // Otra cuenta en el mismo navegador, sin conexión, no ve las citas de la anterior.
  await signIn(page, SEED.customer2);
  await context.setOffline(true);
  try {
    await page.goto("/mis-citas");
    await expect(page.getByRole("heading", { name: "Sin conexión" })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});

test("sin conexión aparece el aviso arriba; la pantalla sin conexión es accesible", async ({
  page,
  context,
}) => {
  await page.goto("/sin-conexion");
  await expect(page.getByRole("heading", { name: "Sin conexión" })).toBeVisible();
  await expectAccessible(page);

  await page.goto("/");
  await context.setOffline(true);
  try {
    await expect(page.getByRole("status").filter({ hasText: "Sin conexión." })).toBeVisible();
    await expectAccessible(page);
  } finally {
    await context.setOffline(false);
  }
  await expect(page.getByRole("status").filter({ hasText: "Sin conexión." })).toHaveCount(0);
});

test("Más: el barbero ve Avisos; el permiso no se pide al abrir", async ({ page, context }) => {
  // Chromium sin interfaz deja el permiso en "denied" ("Bloqueaste los avisos..."). Concedido de
  // antemano, la sección muestra el estado de un celular sin suscripción.
  await context.grantPermissions(["notifications"]);
  let asked = false;
  await page.exposeFunction("__permissionAsked", () => {
    asked = true;
  });
  await page.addInitScript(() => {
    const original = Notification.requestPermission.bind(Notification);
    Notification.requestPermission = (...args) => {
      void (window as unknown as { __permissionAsked: () => void }).__permissionAsked();
      return original(...args);
    };
  });

  await signIn(page, SEED.admin, "/panel/mas");
  await expect(page).toHaveURL("/panel/mas");
  const section = page.locator("section", { has: page.getByRole("heading", { name: "Avisos" }) });
  await expect(section.getByRole("button", { name: "Activar avisos" })).toBeVisible();
  await expect(section).toContainText("cuando un cliente reserve, cambie, confirme o cancele");
  // La barra de pestañas es sticky: lo que queda a medias debajo de ella, axe lo marca
  // (target-size). Al final de la página nada queda debajo (como en cuentas.spec).
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expectAccessible(page);
  expect(asked).toBe(false);
});

test("la ruta de despacho exige el secreto y avanza el cursor", async ({ request }) => {
  const denied = await request.post("/api/notifications/dispatch");
  expect(denied.status()).toBe(401);

  await bookFreeSlot(SEED.customer, await dayWithSlots(1));
  const response = await request.post("/api/notifications/dispatch", {
    headers: { Authorization: `Bearer ${dispatchSecret()}` },
  });
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.ok).toBe(true);
  // No se exige `pending: false`: un hueco reciente en booking_events (por ejemplo, las
  // transacciones deshechas de pnpm db:test) para el cursor 2 minutos, a propósito.
  expect(body.consumers.push).toHaveProperty("handled");
  expect(body.consumers.push.error).toBeUndefined();
});
