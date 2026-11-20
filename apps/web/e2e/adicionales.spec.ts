import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  availableStarts,
  cancelTestAppointments,
  cleanPanelTestData,
  dayWithSlots,
  E2E_PREFIX,
  SEED,
} from "./support/supabase";
import { settleAnimations } from "./support/animations";

/*
 * Adicionales del corte (20/11/2026): barba, cejas y diseño se marcan como chips dentro de
 * "Corte"; cada uno suma su precio y sus minutos (la barba, 1 h), y las horas libres se calculan
 * con la duración completa. La semilla deja el corte sin precio, así que el total dice
 * [PENDIENTE]; la duración sí cambia.
 */

test.describe.configure({ mode: "serial" });

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const bottomBar = (page: Page) => page.locator('[data-slot="bottom-bar"]');
const servicesSection = (page: Page) => page.locator('section[aria-labelledby="servicios"]');
const chip = (page: Page, name: string) =>
  page.locator('[data-slot="addon-chip"]', { hasText: name });
const total = (page: Page) => page.getByRole("status").filter({ hasText: "Total" });

/** Marca un chip y espera a que termine su transición de color (axe mide el color final). */
async function mark(page: Page, name: string) {
  await chip(page, name).click();
  await expect(page.getByRole("checkbox", { name: new RegExp(name) })).toBeChecked();
  await expect.poll(() => chip(page, name).evaluate((el) => el.getAnimations().length)).toBe(0);
}

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
  await expect(page).toHaveURL(next);
}

test.beforeAll(async () => {
  await cancelTestAppointments();
});

test.afterAll(async () => {
  await cancelTestAppointments();
  await cleanPanelTestData();
});

test("en el inicio, la barba se marca como chip y alarga la cita una hora", async ({ page }) => {
  await page.goto("/");
  await servicesSection(page).locator("summary", { hasText: "Corte normal" }).click();

  // Los adicionales, con lo que suman; ninguno marcado.
  await expect(chip(page, "Barba")).toContainText("+$15.000");
  await expect(chip(page, "Barba")).toContainText("+60 min");
  await expect(chip(page, "Cejas")).toContainText("+$5.000");
  await expect(chip(page, "Diseño")).toContainText("+$5.000");
  await expect(page.getByRole("checkbox", { name: /Barba/ })).not.toBeChecked();
  await expect(total(page)).toContainText("60 min");
  await expectAccessible(page);

  // Marcar la barba: el total y las horas cambian, y la URL la lleva.
  await mark(page, "Barba");
  await expect(total(page)).toContainText("2 h");
  await expect(page).toHaveURL(new RegExp(`adicional=${SEED.addons.barba}`));
  const quickSlot = servicesSection(page)
    .locator('[data-slot="quick-slots"]')
    .getByRole("group")
    .getByRole("link")
    .first();
  await expect(quickSlot).toHaveAttribute("href", new RegExp(`adicional=${SEED.addons.barba}`));
  await expectAccessible(page);

  // Una hora rápida lleva a "Confirmar" con el corte y la barba, dos horas.
  await quickSlot.click();
  await expect(page).toHaveURL(/\/reservar\/confirmar\?/);
  const summary = page.getByRole("region", { name: "Resumen de la cita" });
  await expect(summary.getByRole("heading", { name: "Corte normal + Barba" })).toBeVisible();
  const startAt = new URL(page.url()).searchParams.get("hora")!;
  const start = new Date(startAt);
  const end = new Date(start.getTime() + 2 * 60 * 60_000);
  const hour = (d: Date) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Bogota",
      hour: "numeric",
      hour12: true,
    })
      .format(d)
      .split(" ")[0];
  // "3:00 p. m. a 5:00 p. m.": termina dos horas después.
  await expect(summary).toContainText(` a ${hour(end)}:00`);
  await expect(summary.getByText("Total", { exact: true })).toBeVisible();
});

test("el paso Servicio elige los adicionales y los lleva al horario y de vuelta", async ({
  page,
}) => {
  await page.goto("/reservar");
  await expect(page.getByRole("heading", { name: "¿Qué servicio quieres?" })).toBeVisible();
  await expect(page.getByText("Paso 1 de 3")).toBeVisible();

  // Con un solo servicio, ya está abierto.
  await mark(page, "Cejas");
  await mark(page, "Diseño");
  await expect(total(page)).toContainText("60 min");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page).toHaveURL(/\/reservar\/horario\?/);
  const params = new URL(page.url()).searchParams;
  expect(params.getAll("adicional").sort()).toEqual([SEED.addons.cejas, SEED.addons.diseno].sort());
  await expect(page.getByText("Corte normal + Cejas + Diseño · 60 min")).toBeVisible();
  await expect(page.getByText("Paso 2 de 3")).toBeVisible();

  // "Cambiar" vuelve al servicio con lo marcado.
  await page.getByRole("link", { name: "Cambiar" }).click();
  await expect(page).toHaveURL(/\/reservar\?/);
  await expect(page.getByRole("checkbox", { name: /Cejas/ })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: /Diseño/ })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: /Barba/ })).not.toBeChecked();
});

test("reservar con barba ocupa dos horas y Mis citas la nombra con sus adicionales", async ({
  page,
}) => {
  const day = await dayWithSlots(3);
  const withBeard = [SEED.addons.barba];
  const [startAt] = await availableStarts(day, withBeard);
  await signIn(page, SEED.customer, "/");
  await page.goto(
    `/reservar/confirmar?servicio=${SEED.serviceId}&adicional=${SEED.addons.barba}` +
      `&barbero=${SEED.barberId}&fecha=${day}&hora=${encodeURIComponent(startAt!)}`,
  );
  await bottomBar(page).getByRole("button", { name: "Reservar" }).click();
  await expect(page).toHaveURL(/\/reservar\/listo\?cita=/);
  await expect(page.getByRole("heading", { name: "Corte normal + Barba" })).toBeVisible();

  // La hora siguiente también quedó ocupada: la barba suma una hora (regla 3 en la base).
  const after = await availableStarts(day);
  const nextHour = new Date(Date.parse(startAt!) + 60 * 60_000).toISOString();
  expect(after).not.toContain(startAt);
  expect(after).not.toContain(nextHour);

  await page.goto("/mis-citas");
  await expect(page.getByText("Corte normal + Barba").first()).toBeVisible();
});

test("sin JavaScript, Agrega funciona con su botón", async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("/");
  await servicesSection(page).locator("summary", { hasText: "Corte normal" }).click();
  await chip(page, "Barba").click();
  await page.getByRole("button", { name: "Ver horas con lo que agregaste" }).click();
  await expect(page).toHaveURL(new RegExp(`adicional=${SEED.addons.barba}`));
  // La tarjeta vuelve abierta y "Ver todas las horas" lleva la barba.
  await expect(page.getByRole("checkbox", { name: /Barba/ })).toBeChecked();
  await expect(page.getByRole("link", { name: "Ver todas las horas" })).toHaveAttribute(
    "href",
    new RegExp(`adicional=${SEED.addons.barba}`),
  );
  await context.close();
});

test("el administrador agrega, cambia y desactiva un adicional", async ({ page }) => {
  const name = `${E2E_PREFIX} Mascarilla ${Date.now()}`;
  await signIn(page, SEED.admin, `/panel/servicios/${SEED.serviceId}`);
  await expect(page.getByLabel("Grupo")).toBeVisible();
  await page.getByRole("link", { name: /Adicionales/ }).click();
  await expect(page.getByText("Barba", { exact: true })).toBeVisible();
  await expectAccessible(page);

  await page.getByRole("link", { name: "Nuevo" }).click();
  await page.getByLabel("Nombre").fill(name);
  await page.getByLabel("Minutos que suma").fill("7");
  await bottomBar(page).getByRole("button", { name: "Agregar" }).click();
  await expect(page.getByText(/múltiplos de 5/).first()).toBeVisible();
  await page.getByLabel("Minutos que suma").fill("15");
  await page.getByLabel("Precio en pesos").fill("8.000");
  await bottomBar(page).getByRole("button", { name: "Agregar" }).click();
  await expect(page).toHaveURL(`/panel/servicios/${SEED.serviceId}/adicionales`);
  await expect(page.getByRole("link", { name: new RegExp(name) })).toContainText("+$8.000");

  // En el inicio aparece como chip.
  await page.goto("/");
  await servicesSection(page).locator("summary", { hasText: "Corte normal" }).click();
  await expect(chip(page, name)).toContainText("+15 min");

  // Desactivado, ya no se ofrece.
  await page.goto(`/panel/servicios/${SEED.serviceId}/adicionales`);
  await page.getByRole("link", { name: new RegExp(name) }).click();
  await page.getByText("Activo", { exact: true }).click();
  await bottomBar(page).getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("link", { name: new RegExp(`${name}.*Inactivo`) })).toBeVisible();
  await page.goto("/");
  await servicesSection(page).locator("summary", { hasText: "Corte normal" }).click();
  await expect(chip(page, name)).toHaveCount(0);
});
