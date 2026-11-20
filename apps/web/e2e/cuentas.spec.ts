import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { asSupabaseDefaultLink, countEmails, linkFromEmail } from "./support/mailpit";

/*
 * F3: cuentas y datos personales, a 390 px. Necesita Supabase local (`pnpm db:start`) con la
 * semilla: barbero@ejemplo.test (administrador y barbero) y cliente@ejemplo.test (cliente),
 * las dos con la contraseña possos-local. Los correos llegan a Mailpit.
 */

const SEED_PASSWORD = "possos-local";
const PASSWORD = "clave-de-prueba-1";
const CONFIRM_SUBJECT = /Confirma tu correo/;
const RESET_SUBJECT = /Cambia tu contraseña/;

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

function newEmail(label: string) {
  return `e2e-${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@ejemplo.test`;
}

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

const bottomBar = (page: Page) => page.locator('[data-slot="bottom-bar"]');

async function signIn(page: Page, email: string, password: string) {
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await bottomBar(page).getByRole("button", { name: "Ingresar" }).click();
}

/** Crea una cuenta con correo, la activa con el enlace de Mailpit y completa el perfil. */
async function registerCustomer(page: Page, email: string, next = "/perfil") {
  await page.goto(`/registrarse?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await bottomBar(page).getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { name: "Revisa tu correo" })).toBeVisible();

  await page.goto(await linkFromEmail(email, CONFIRM_SUBJECT));
  await expect(page).toHaveURL(/\/completar-perfil\?next=/);
  await page.getByLabel("Nombre").fill("Cliente de Playwright");
  await page.getByLabel("Celular").fill("3001234567");
  await page.locator("label", { hasText: "Autorizo a Possos Barber" }).tap();
  await bottomBar(page).getByRole("button", { name: "Guardar y continuar" }).click();
}

test("registro con correo, completar perfil, cerrar sesión e ingresar de nuevo", async ({
  page,
}) => {
  const email = newEmail("registro");
  // Como si viniera del paso "Confirmar" de F4, con lo que eligió en la consulta.
  const next = "/perfil?servicio=corte&hora=2026-11-20T15%3A00";

  await page.goto(`/ingresar?next=${encodeURIComponent(next)}`);
  await expectAccessible(page);
  await page.getByRole("link", { name: "Crea una" }).click();
  await expect(page).toHaveURL(`/registrarse?next=${encodeURIComponent(next)}`);
  // En una navegación del cliente, Next cambia el título después de pintar.
  await expect(page).toHaveTitle("Crea tu cuenta · Possos Barber");
  await expectAccessible(page);

  // La contraseña corta se rechaza antes de enviar.
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill("corta");
  await bottomBar(page).getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByText("La contraseña debe tener al menos 8 caracteres")).toBeVisible();

  await page.getByLabel("Contraseña").fill(PASSWORD);
  await bottomBar(page).getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { name: "Revisa tu correo" })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();

  // El enlace del correo activa la cuenta y lleva a completar el perfil, sin perder `next`.
  await page.goto(await linkFromEmail(email, CONFIRM_SUBJECT));
  await expect(page).toHaveURL(`/completar-perfil?next=${encodeURIComponent(next)}`);
  await expect(page.getByRole("heading", { name: "Completa tu perfil" })).toBeVisible();
  await expectAccessible(page);

  // Las dos casillas van separadas y sin marcar.
  const consent = page.getByRole("checkbox", { name: /Autorizo a Possos Barber/ });
  const whatsapp = page.getByRole("checkbox", { name: /Quiero recibir por WhatsApp/ });
  await expect(consent).not.toBeChecked();
  await expect(whatsapp).not.toBeChecked();
  await expect(
    page.getByText("Opcional. Sin esta autorización no te llegan los recordatorios."),
  ).toBeVisible();

  // Un celular mal escrito se rechaza con un mensaje claro antes de enviar.
  await page.getByLabel("Nombre").fill("Cliente de Playwright");
  const phone = page.getByLabel("Celular");
  await phone.fill("6012345678");
  await phone.blur();
  await expect(
    page.getByText("Escribe un número de celular: en Colombia empiezan por 3"),
  ).toBeVisible();
  await expect(phone).toHaveAttribute("aria-invalid", "true");
  await phone.fill("300 12");
  await bottomBar(page).getByRole("button", { name: "Guardar y continuar" }).click();
  await expect(page.getByText("El celular debe tener 10 dígitos, sin el +57")).toBeVisible();
  await expect(page).toHaveURL(/\/completar-perfil/);

  // Pegado con +57 y espacios, queda en 10 dígitos.
  await phone.fill("+57 300 123 4567");
  await expect(phone).toHaveValue("3001234567");

  // Sin la autorización de datos no se guarda.
  await bottomBar(page).getByRole("button", { name: "Guardar y continuar" }).click();
  await expect(page.getByText("Sin esta autorización no podemos crear tu cuenta")).toBeVisible();
  await expect(page).toHaveURL(/\/completar-perfil/);

  await page.locator("label", { hasText: "Autorizo a Possos Barber" }).tap();
  await expect(consent).toBeChecked();
  await bottomBar(page).getByRole("button", { name: "Guardar y continuar" }).click();

  // Vuelve a donde iba, con la consulta intacta.
  await expect(page).toHaveURL(next);
  await expect(page.getByRole("heading", { name: "Tu perfil" })).toBeVisible();
  await expect(page.getByLabel("Nombre")).toHaveValue("Cliente de Playwright");
  await expect(page.getByLabel("Celular")).toHaveValue("3001234567");
  await expectAccessible(page);

  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL("/ingresar");

  // Al ingresar, el cliente va al inicio con la sesión abierta.
  await signIn(page, email, PASSWORD);
  await expect(page).toHaveURL("/");
  await page.getByRole("link", { name: "Tu perfil" }).click();
  await expect(page.getByLabel("Nombre")).toHaveValue("Cliente de Playwright");
});

test("una cuenta sin activar no ingresa y puede pedir el enlace otra vez", async ({ page }) => {
  const email = newEmail("sin-activar");
  await page.goto("/registrarse");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await bottomBar(page).getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { name: "Revisa tu correo" })).toBeVisible();
  await expect.poll(() => countEmails(email, CONFIRM_SUBJECT)).toBe(1);

  await page.goto("/ingresar");
  await signIn(page, email, PASSWORD);
  await expect(
    page.getByText("Primero activa tu cuenta con el enlace que te enviamos al correo"),
  ).toBeVisible();
  // Supabase deja reenviar una vez por segundo en local (max_frequency de config.toml).
  await page.waitForTimeout(1_100);
  await page.getByRole("button", { name: "Reenviar el enlace" }).click();
  await expect(page.getByText("Te enviamos otra vez el enlace de activación")).toBeVisible();
  await expect.poll(() => countEmails(email, CONFIRM_SUBJECT)).toBe(2);
});

test("editar el perfil, cambiar la autorización de WhatsApp y borrar la cuenta", async ({
  page,
}) => {
  const email = newEmail("borrar");
  await registerCustomer(page, email);
  await expect(page).toHaveURL("/perfil");

  const whatsapp = page.getByRole("checkbox", { name: /Quiero recibir por WhatsApp/ });
  await expect(whatsapp).not.toBeChecked();
  // En el perfil no se vuelve a pedir la autorización de datos.
  await expect(page.getByRole("checkbox", { name: /Autorizo a Possos Barber/ })).toHaveCount(0);

  await page.getByLabel("Nombre").fill("Nombre Cambiado");
  await page.locator("label", { hasText: "Quiero recibir por WhatsApp" }).tap();
  // Guardar lleva al inicio, con la sesión abierta.
  await bottomBar(page).getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page).toHaveURL("/?aviso=perfil-guardado");
  await expect(page.getByText("Guardamos tus cambios.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Tu perfil" })).toBeVisible();

  await page.goto("/perfil");
  await expect(page.getByLabel("Nombre")).toHaveValue("Nombre Cambiado");
  await expect(whatsapp).toBeChecked();

  await page.getByRole("button", { name: "Borrar mi cuenta" }).click();
  const sheet = page.getByRole("dialog", { name: "¿Borrar tu cuenta?" });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "Sí, borrar mi cuenta" }).click();

  await expect(page).toHaveURL("/ingresar?aviso=cuenta-borrada");
  await expect(page.getByText("Borramos tu cuenta y tus datos.")).toBeVisible();

  await signIn(page, email, PASSWORD);
  await expect(page.getByText("El correo o la contraseña no coinciden")).toBeVisible();
});

test("recuperar la contraseña con el enlace del correo", async ({ page }) => {
  const email = newEmail("contrasena");
  await registerCustomer(page, email);
  await expect(page).toHaveURL("/perfil");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL("/ingresar");

  await page.getByRole("link", { name: "Olvidé mi contraseña" }).click();
  await expect(page).toHaveURL("/recuperar-contrasena");
  await expect(page).toHaveTitle("Cambia tu contraseña · Possos Barber");
  await expectAccessible(page);
  await page.getByLabel("Correo").fill(email);
  await bottomBar(page).getByRole("button", { name: "Enviar el enlace" }).click();
  await expect(page.getByRole("heading", { name: "Revisa tu correo" })).toBeVisible();

  await page.goto(await linkFromEmail(email, RESET_SUBJECT));
  await expect(page).toHaveURL("/nueva-contrasena");
  const nueva = "otra-clave-segura-2";
  await page.getByLabel("Contraseña nueva").fill(nueva);
  await bottomBar(page).getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/perfil");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await signIn(page, email, PASSWORD);
  await expect(page.getByText("El correo o la contraseña no coinciden")).toBeVisible();
  await signIn(page, email, nueva);
  await expect(page).toHaveURL("/");
});

test("el personal entra al panel", async ({ page }) => {
  await page.goto("/ingresar");
  await signIn(page, "barbero@ejemplo.test", SEED_PASSWORD);
  await expect(page).toHaveURL("/panel");
  await expect(page.getByRole("heading", { name: /^Hoy · / })).toBeVisible();
  await page.getByRole("link", { name: "Más" }).click();
  await expect(page.getByText(/^Administrador y barbero/)).toBeVisible();
  // La barra de pestañas es sticky: al cargar, "Cerrar sesión" puede quedar a medias debajo de
  // ella y axe lo marca (target-size). Al final de la página nada queda debajo.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expectAccessible(page);

  // Con sesión, ingresar lleva directo al panel.
  await page.goto("/ingresar");
  await expect(page).toHaveURL("/panel");
});

test("un cliente no puede abrir el panel ni por URL directa", async ({ page }) => {
  await page.goto("/ingresar");
  await signIn(page, "cliente@ejemplo.test", SEED_PASSWORD);
  await expect(page).toHaveURL("/");

  for (const path of ["/panel", "/panel/agenda", "/panel/servicios", "/panel/cita/nueva"]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: /^Hoy/ })).toHaveCount(0);
  }
});

test("sin sesión, una ruta protegida manda a ingresar y vuelve a ella", async ({ page }) => {
  await page.goto("/panel?vista=semana");
  await expect(page).toHaveURL(`/ingresar?next=${encodeURIComponent("/panel?vista=semana")}`);
  await signIn(page, "barbero@ejemplo.test", SEED_PASSWORD);
  await expect(page).toHaveURL("/panel?vista=semana");
});

test("next solo acepta rutas internas", async ({ page }) => {
  await page.goto(`/ingresar?next=${encodeURIComponent("//ejemplo.com/robar")}`);
  await signIn(page, "cliente@ejemplo.test", SEED_PASSWORD);
  await expect(page).toHaveURL("/");
});

test("la política de datos es pública, versionada y marca lo pendiente", async ({ page }) => {
  await page.goto("/politica-de-datos");
  await expect(
    page.getByRole("heading", { level: 1, name: "Política de tratamiento de datos personales" }),
  ).toBeVisible();
  await expect(page.getByText(/^Versión /)).toBeVisible();
  await expect(page.getByText(/\[PENDIENTE\]/).first()).toBeVisible();
  await expectAccessible(page);
});

/*
 * Producción usa las plantillas de correo de Supabase (el plan gratuito no deja cambiarlas sin
 * SMTP propio). Sus enlaces pasan por /auth/v1/verify y vuelven a /auth/callback con ?code=.
 */
test.describe("con las plantillas de correo de Supabase", () => {
  async function signUp(page: Page, email: string, next: string) {
    await page.goto(`/registrarse?next=${encodeURIComponent(next)}`);
    await page.getByLabel("Correo").fill(email);
    await page.getByLabel("Contraseña").fill(PASSWORD);
    await bottomBar(page).getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.getByRole("heading", { name: "Revisa tu correo" })).toBeVisible();
    return asSupabaseDefaultLink(await linkFromEmail(email, CONFIRM_SUBJECT), "signup");
  }

  test("activar en el mismo navegador abre la sesión y sigue a next", async ({ page }) => {
    const next = "/perfil?servicio=corte";
    const link = await signUp(page, newEmail("plantilla"), next);
    await page.goto(link);
    await expect(page).toHaveURL(`/completar-perfil?next=${encodeURIComponent(next)}`);
  });

  test("activar en otro navegador deja la cuenta activa y pide ingresar", async ({
    page,
    browser,
  }) => {
    const email = newEmail("otro-navegador");
    const link = await signUp(page, email, "/perfil");

    const other = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const otherPage = await other.newPage();
    await otherPage.goto(link);
    await expect(otherPage).toHaveURL(/\/ingresar\?aviso=cuenta-activada/);
    await expect(
      otherPage.getByText("Tu correo quedó confirmado. Ingresa con tu contraseña para seguir."),
    ).toBeVisible();
    await signIn(otherPage, email, PASSWORD);
    await expect(otherPage).toHaveURL(/\/completar-perfil/);
    await other.close();
  });

  test("cambiar la contraseña con el enlace", async ({ page }) => {
    const email = newEmail("plantilla-clave");
    await registerCustomer(page, email);
    await expect(page).toHaveURL("/perfil");
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await page.goto("/recuperar-contrasena");
    await page.getByLabel("Correo").fill(email);
    await bottomBar(page).getByRole("button", { name: "Enviar el enlace" }).click();
    await expect(page.getByRole("heading", { name: "Revisa tu correo" })).toBeVisible();

    await page.goto(asSupabaseDefaultLink(await linkFromEmail(email, RESET_SUBJECT), "recovery"));
    await expect(page).toHaveURL("/nueva-contrasena");
    await page.getByLabel("Contraseña nueva").fill("otra-clave-segura-3");
    await bottomBar(page).getByRole("button", { name: "Guardar contraseña" }).click();
    await expect(page).toHaveURL("/");
  });
});
