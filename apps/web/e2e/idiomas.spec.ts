import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { SEED } from "./support/supabase";

/*
 * Idiomas (docs/11, "Idiomas"): español por omisión y el botón ES/EN arriba a la derecha. El
 * idioma va en una cookie, así que cada prueba (un contexto nuevo) empieza en español.
 */

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

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

const toEnglish = (page: Page) => page.getByRole("button", { name: "English" }).first();
const toSpanish = (page: Page) => page.getByRole("button", { name: "Español" }).first();

test("el inicio está en español y el botón lo pasa a inglés y de vuelta", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "es-CO");
  await expect(page.getByRole("heading", { name: "Possos Barber", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Servicios" })).toBeVisible();
  // "Barbería en Girardot" ya no va en el inicio.
  await expect(page.getByText("Barbería en Girardot")).toHaveCount(0);

  await toEnglish(page).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "Services" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Location" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  await expectAccessible(page);

  // El idioma sigue al navegar: el horario y la política también salen en inglés.
  await page.goto("/reservar/horario");
  await expect(page.getByRole("heading", { name: "Choose your time" })).toBeVisible();
  await expect(page.getByText(/Step 1 of \d/)).toBeVisible();
  await page.goto("/politica-de-datos");
  await expect(
    page.getByRole("heading", { level: 1, name: "Personal data processing policy" }),
  ).toBeVisible();
  await expect(page.getByText("The Spanish version is the one that governs.")).toBeVisible();
  await expectAccessible(page);

  await toSpanish(page).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "es-CO");
  await expect(
    page.getByRole("heading", { level: 1, name: "Política de tratamiento de datos personales" }),
  ).toBeVisible();
});

test("el botón de idioma funciona sin JavaScript", async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("/");
  await toEnglish(page).click();
  await expect(page.getByRole("heading", { name: "Services" })).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Services" })).toBeVisible();
  await context.close();
});

test("con sesión, el encabezado del inicio cabe a 390 px en los dos idiomas", async ({ page }) => {
  await page.goto("/ingresar");
  await page.getByLabel("Correo").fill(SEED.customer);
  await page.getByLabel("Contraseña").fill(SEED.password);
  await page.locator('[data-slot="bottom-bar"]').getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("link", { name: "Mis citas", exact: true })).toBeVisible();
  await expectAccessible(page);

  await toEnglish(page).click();
  await expect(page.getByRole("link", { name: "My bookings", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Profile", exact: true })).toBeVisible();
  await expectAccessible(page);
});
