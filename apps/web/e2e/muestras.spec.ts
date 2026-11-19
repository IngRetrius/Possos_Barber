import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/*
 * F1: la página de muestras a 390 px. Cubre los criterios de aceptación de
 * fases/F1-sistema-diseno.md que se pueden medir con una herramienta.
 */

const DAY_NAME =
  /^(lunes|martes|miércoles|jueves|viernes|sábado|domingo) \d{1,2} de [a-z]+, (sin horas|1 hora libre|\d+ horas libres)$/;

async function open(page: Page) {
  await page.goto("/muestras");
  await expect(page.getByRole("heading", { level: 1, name: "Muestras" })).toBeVisible();
}

test("se ve completa a 390 px sin desplazamiento horizontal", async ({ page }) => {
  await open(page);
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(clientWidth).toBe(390);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});

test("no tiene fallas de accesibilidad de WCAG 2.2 AA, incluido el contraste", async ({ page }) => {
  await open(page);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`),
  ).toEqual([]);
});

test("la hoja abierta tampoco tiene fallas de accesibilidad", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Cancelar cita" }).click();
  await expect(page.getByRole("dialog", { name: /^¿Cancelar tu cita del / })).toBeVisible();
  await page.waitForTimeout(300); // fin de la animación de entrada
  const results = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});

test("todo control mide al menos 48 px de alto (44 px los íconos sueltos)", async ({ page }) => {
  await open(page);
  const small = await page.evaluate(() => {
    const targets = new Set<Element>();
    document.querySelectorAll("button, a[href], input, textarea, select").forEach((el) => {
      // Radios y casillas son invisibles: el área táctil es su etiqueta.
      const input = el as HTMLInputElement;
      const isChoice = el.tagName === "INPUT" && ["radio", "checkbox"].includes(input.type);
      // El celular: la caja con el prefijo enfoca el campo al tocarla.
      const phone = el.closest('[data-slot="phone-input"]');
      targets.add(isChoice ? (el.closest("label") ?? el) : (phone ?? el));
    });
    return [...targets]
      .map((el) => {
        const r = el.getBoundingClientRect();
        const icon = el.getAttribute("data-slot") === "icon-button";
        const minH = icon ? 44 : 48;
        const minW = 44;
        return {
          el: `${el.tagName.toLowerCase()} "${(el.textContent ?? el.getAttribute("aria-label") ?? "").trim().slice(0, 30)}"`,
          w: Math.round(r.width),
          h: Math.round(r.height),
          ok: r.width === 0 || (r.height >= minH && r.width >= minW),
        };
      })
      .filter((t) => !t.ok);
  });
  expect(small).toEqual([]);
});

test("la tira de días se usa con el teclado y anuncia cada día completo", async ({ page }) => {
  await open(page);
  const strip = page.getByRole("radiogroup", { name: "Día" });
  const days = strip.getByRole("radio");
  const names = await days.evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
  expect(names.length).toBe(14);
  for (const name of names) expect(name).toMatch(DAY_NAME);

  const checked = strip.getByRole("radio", { checked: true });
  await checked.focus();
  const before = await checked.getAttribute("value");
  await page.keyboard.press("ArrowRight");
  const after = await strip.getByRole("radio", { checked: true }).getAttribute("value");
  expect(after).not.toBe(before);
  await expect(strip.getByRole("radio", { checked: true })).toBeFocused();

  // El día apagado no se puede elegir y las flechas lo saltan.
  const disabled = strip.locator("input:disabled");
  await expect(disabled).toHaveCount(1);
});

test("la cuadrícula de horas se usa con el teclado y anuncia la hora completa", async ({
  page,
}) => {
  await open(page);
  const grid = page.getByRole("radiogroup", { name: "Horas libres" });
  await expect(grid.getByRole("group").first()).toHaveAccessibleName(/^(Mañana|Tarde|Noche)$/);
  const first = grid.getByRole("radio").first();
  await expect(first).toHaveAccessibleName(/^\d{1,2}:\d{2}\u00a0[ap]\.\u00a0m\.$/);

  const continuar = page
    .locator('[data-slot="bottom-bar"]')
    .getByRole("button", { name: "Continuar" });
  await expect(continuar).toBeDisabled();

  await first.focus();
  await page.keyboard.press("Space");
  await expect(first).toBeChecked();
  await page.keyboard.press("ArrowRight");
  await expect(grid.getByRole("radio").nth(1)).toBeChecked();
  await expect(first).not.toBeChecked();
  await expect(continuar).toBeEnabled();

  const name = await grid.getByRole("radio").nth(1).getAttribute("aria-label");
  await expect(page.locator('[data-slot="bottom-bar"] [aria-live]')).toContainText(name ?? "");

  // Con el dedo: tocar la hora la elige.
  await grid.locator("label").nth(2).tap();
  await expect(grid.getByRole("radio").nth(2)).toBeChecked();
});

test("la hoja se abre y se cierra con el teclado y devuelve el foco", async ({ page }) => {
  await open(page);
  const trigger = page.getByRole("button", { name: "Cancelar cita" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: /^¿Cancelar tu cita del / });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("La hora queda libre");
  // El foco queda atrapado en la hoja (en el diálogo o en algo de adentro).
  await expect.poll(() => dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Tab");
  expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await dialog.getByRole("button", { name: "Cerrar" }).click();
  await expect(dialog).toBeHidden();
});

test("la hoja se cierra con el gesto atrás sin salir de la página", async ({ page }) => {
  await open(page);
  const lengthBefore = await page.evaluate(() => history.length);
  await page.getByRole("button", { name: "Cancelar cita" }).click();
  const dialog = page.getByRole("dialog", { name: /^¿Cancelar tu cita del / });
  await expect(dialog).toBeVisible();

  await page.goBack();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/muestras$/);
  await expect(page.getByRole("heading", { level: 1, name: "Muestras" })).toBeVisible();

  // Cerrar con el botón no deja una entrada de más en el historial.
  await page.getByRole("button", { name: "Cancelar cita" }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cerrar" }).click();
  await expect(dialog).toBeHidden();
  await expect.poll(() => page.evaluate(() => history.state?.possosSheet)).toBeUndefined();
  expect(await page.evaluate(() => history.length)).toBeGreaterThanOrEqual(lengthBefore);
});

test("usa Geist con cifras tabulares", async ({ page }) => {
  await open(page);
  const font = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(font).toMatch(/Geist/);
  // Con tabular-nums, "11:11" y "10:00" miden lo mismo.
  const widths = await page.evaluate(() => {
    const measure = (text: string) => {
      const span = document.createElement("span");
      span.className = "text-label tabular-nums";
      span.textContent = text;
      document.body.append(span);
      const w = span.getBoundingClientRect().width;
      span.remove();
      return w;
    };
    return [measure("11:11"), measure("10:00")];
  });
  expect(widths[0]).toBeCloseTo(widths[1]!, 1);
});
