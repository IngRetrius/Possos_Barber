import AxeBuilder from "@axe-core/playwright";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  appointmentStatus,
  availableStarts,
  bookFreeSlot,
  cancelTestAppointments,
  cleanPanelTestData,
  dayWithSlots,
  E2E_PREFIX,
  pastWalkInAppointment,
  pesos,
  SEED,
  todaySettlement,
} from "./support/supabase";

/*
 * F6: panel del barbero y del administrador, a 390 px. Necesita Supabase local con la semilla,
 * Realtime (agenda en vivo) y Storage (foto y portafolio). Las pruebas crean citas, bloqueos y
 * servicios reales: corren en serie y, antes y después, se cancelan las citas de prueba, se
 * borran los bloqueos `E2E...` y se desactivan los servicios `E2E...`.
 */

test.describe.configure({ mode: "serial" });

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const IMAGE = join(import.meta.dirname, "../public/icons/icon-512.png");

const bottomBar = (page: Page) => page.locator('[data-slot="bottom-bar"]');
const agenda = (page: Page) => page.getByRole("list", { name: "Agenda del día" });
const sheet = (page: Page) => page.getByRole("dialog");

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

async function signIn(page: Page, email: string, next = "/panel") {
  await page.goto(`/ingresar?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(SEED.password);
  await bottomBar(page).getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL((url) => url.pathname !== "/ingresar");
}

/** `HH:MM` de Bogotá (UTC-5) de un instante. */
function bogotaTime(iso: string, plusMinutes = 0): string {
  return new Date(new Date(iso).getTime() + (plusMinutes - 300) * 60_000)
    .toISOString()
    .slice(11, 16);
}

/**
 * Marca en `window.__postgres` los canales con Postgres Changes ya suscritos. Realtime manda un
 * mensaje `system` "Subscribed to PostgreSQL" cuando la suscripción a la tabla está lista.
 * Los mensajes llegan en arreglo: `[join_ref, ref, topic, event, payload]`.
 */
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

test.beforeAll(async () => {
  await cancelTestAppointments();
  await cleanPanelTestData();
});

test.afterAll(async () => {
  await cancelTestAppointments();
  await cleanPanelTestData();
});

test("una reserva del cliente aparece en la agenda en menos de 3 segundos", async ({ page }) => {
  trackPostgresChanges(page);
  const day = await dayWithSlots(2);
  await signIn(page, SEED.admin, `/panel?dia=${day}`);
  await expect(agenda(page)).toBeVisible();
  await expectAccessible(page);

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
  await expect(agenda(page).getByText("Cliente dos de prueba")).toHaveCount(0);

  await bookFreeSlot(SEED.customer2, day);
  await expect(agenda(page).getByText("Cliente dos de prueba")).toBeVisible({ timeout: 3_000 });
});

test("nueva cita para un cliente nuevo desde una hora libre, y cancelarla con motivo", async ({
  page,
}) => {
  const day = await dayWithSlots(3);
  await signIn(page, SEED.admin, `/panel?dia=${day}`);
  const started = Date.now();

  await agenda(page).getByRole("link", { name: /Libre/ }).first().click();
  await expect(page).toHaveURL(/\/panel\/cita\/nueva\?hora=/);
  await expect(page.getByLabel("Hora", { exact: true })).not.toHaveValue("");
  await page.getByRole("button", { name: "Cliente nuevo" }).click();
  const name = `${E2E_PREFIX} Cliente ${Date.now()}`;
  await page.getByLabel("Nombre").fill(name);
  await page.getByLabel("Celular").fill("3009998877");
  await page.getByText("El cliente autorizó de palabra").click();
  await bottomBar(page).getByRole("button", { name: "Crear cita" }).click();

  await expect(page).toHaveURL(new RegExp(`/panel\\?dia=${day}`));
  await expect(page.getByText("Creaste la cita")).toBeVisible();
  await expect(agenda(page).getByText(name)).toBeVisible();
  expect(Date.now() - started).toBeLessThan(30_000);

  await agenda(page)
    .getByRole("button", { name: new RegExp(name) })
    .click();
  await expect(sheet(page).getByRole("heading", { name })).toBeVisible();
  await expect(sheet(page).getByRole("link", { name: /WhatsApp/ })).toHaveAttribute(
    "href",
    "https://wa.me/573009998877",
  );
  await expectAccessible(page);
  await sheet(page).getByRole("button", { name: "Cancelar" }).click();
  await sheet(page).getByRole("button", { name: "Sí, cancelar la cita" }).click();
  await expect(sheet(page).getByText("Escribe el motivo")).toBeVisible();
  await sheet(page).getByLabel("Motivo").fill("Prueba del panel");
  await sheet(page).getByRole("button", { name: "Sí, cancelar la cita" }).click();
  await expect(page.getByText("Cancelaste la cita")).toBeVisible();
  await expect(agenda(page).getByText(name)).toHaveCount(0);
});

test("la nueva cita pide la autorización de datos del cliente nuevo", async ({ page }) => {
  await signIn(page, SEED.admin, "/panel/cita/nueva");
  await page.getByRole("button", { name: "Cliente nuevo" }).click();
  await page.getByLabel("Nombre").fill(`${E2E_PREFIX} Sin autorización`);
  await page.getByLabel("Celular").fill("3009998866");
  await bottomBar(page).getByRole("button", { name: "Crear cita" }).click();
  await expect(
    page.getByText("Sin la autorización del cliente no podemos guardar sus datos"),
  ).toBeVisible();
  await expect(page.getByText("Elige la fecha y la hora")).toBeVisible();
  await expectAccessible(page);
});

test("aprobar y rechazar reservas pendientes", async ({ page }) => {
  const day = await dayWithSlots(3);
  const first = await bookFreeSlot(SEED.approval, day, 0);
  const second = await bookFreeSlot(SEED.approval, day, 1);
  expect(await appointmentStatus(SEED.approval, first.id)).toBe("pending_approval");

  await signIn(page, SEED.admin);
  await expect(page.getByRole("heading", { name: "Pendientes de aprobar (2)" })).toBeVisible();
  await page.getByRole("button", { name: "Aprobar" }).first().click();
  await expect(page.getByText("Aprobaste la reserva")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pendientes de aprobar (1)" })).toBeVisible();
  await page.getByRole("button", { name: "Rechazar" }).first().click();
  await expect(page.getByText("Rechazaste la reserva")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Pendientes de aprobar/ })).toHaveCount(0);

  expect(await appointmentStatus(SEED.approval, first.id)).toBe("booked");
  expect(await appointmentStatus(SEED.approval, second.id)).toBe("rejected");
});

test("un bloqueo encima de una cita la muestra para moverla o cancelarla", async ({ page }) => {
  const day = await dayWithSlots(2);
  const booked = await bookFreeSlot(SEED.customer, day);

  await signIn(page, SEED.admin, "/panel/bloqueos");
  await page.getByLabel("Desde").fill(day);
  await page.getByLabel("Hasta").fill(day);
  await page.getByText("Todo el día").click();
  await page.getByLabel("Hora de inicio").fill(bogotaTime(booked.startAt));
  await page.getByLabel("Hora de fin").fill(bogotaTime(booked.startAt, 60));
  await page.getByLabel("Motivo").fill(`${E2E_PREFIX} bloqueo`);
  await page.getByRole("button", { name: "Bloquear", exact: true }).click();

  await expect(page.getByText("hay 1 cita debajo")).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("link", { name: /Cliente de prueba/ }).click();
  await expect(page).toHaveURL(new RegExp(`cita=${booked.id}`));
  await expect(sheet(page).getByRole("heading", { name: "Cliente de prueba" })).toBeVisible();
  await sheet(page).getByRole("button", { name: "Cancelar" }).click();
  await sheet(page).getByLabel("Motivo").fill("Bloqueo del barbero");
  await sheet(page).getByRole("button", { name: "Sí, cancelar la cita" }).click();
  await expect(page.getByText("Cancelaste la cita")).toBeVisible();
  expect(await appointmentStatus(SEED.customer, booked.id)).toBe("cancelled");

  // El bloqueo se ve en "Hoy" del día y se borra desde "Bloqueos".
  await page.goto(`/panel?dia=${day}`);
  await expect(agenda(page).getByText(`${E2E_PREFIX} bloqueo`)).toBeVisible();
  await page.goto("/panel/bloqueos");
  await page
    .getByRole("button", { name: /^Borrar/ })
    .first()
    .click();
  await expect(page.getByText(`${E2E_PREFIX} bloqueo`)).toHaveCount(0);
  expect(await availableStarts(day)).toContain(booked.startAt);
});

test("el horario semanal avisa si dos rangos se cruzan y se guarda", async ({ page }) => {
  await signIn(page, SEED.admin, "/panel/horario");
  const secondStart = page.getByLabel("Lunes, rango 2, desde");
  await expect(secondStart).toHaveValue("14:00");
  await secondStart.fill("11:00");
  await expect(page.getByText("Dos rangos de este día se cruzan")).toBeVisible();
  await expect(bottomBar(page).getByRole("button", { name: "Guardar horario" })).toBeDisabled();
  await secondStart.fill("14:00");
  await bottomBar(page).getByRole("button", { name: "Guardar horario" }).click();
  await expect(bottomBar(page).getByText("Guardaste el horario")).toBeVisible();
  await expectAccessible(page);
});

test("el administrador crea, edita y desactiva un servicio", async ({ page }) => {
  const name = `${E2E_PREFIX} Barba ${Date.now()}`;
  await signIn(page, SEED.admin, "/panel/servicios");
  await page.getByRole("link", { name: "Nuevo" }).click();
  await page.getByLabel("Nombre").fill(name);
  await page.getByLabel("Duración en minutos").fill("33");
  await bottomBar(page).getByRole("button", { name: "Crear servicio" }).click();
  await expect(page.getByText(/múltiplos de 5/).first()).toBeVisible();
  await page.getByLabel("Duración en minutos").fill("30");
  await page.getByLabel("Precio en pesos").fill("15.000");
  await bottomBar(page).getByRole("button", { name: "Crear servicio" }).click();
  await expect(page).toHaveURL("/panel/servicios");
  await expect(page.getByText(name)).toBeVisible();

  await page.getByRole("link", { name: new RegExp(name) }).click();
  await page.getByText("Activo", { exact: true }).click();
  await bottomBar(page).getByRole("button", { name: "Guardar" }).click();
  await expect(page).toHaveURL("/panel/servicios");
  await expect(page.getByRole("link", { name: new RegExp(`${name}.*Inactivo`) })).toBeVisible();
  await expectAccessible(page);
});

test("foto y portafolio del barbero con una imagen real", async ({ page }) => {
  await signIn(page, SEED.admin, `/panel/barberos/${SEED.barber2Id}`);
  await page.getByLabel(/Subir una foto|Cambiar la foto/).setInputFiles(IMAGE);
  const photo = page.getByRole("img", { name: "Foto de Barbero dos de prueba" });
  await expect(photo).toBeVisible();
  await expect(photo).toHaveJSProperty("complete", true);
  expect(await photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);

  const works = page.getByRole("img", { name: "Trabajo de Barbero dos de prueba" });
  const before = await works.count();
  await page.getByLabel("Agregar una foto").setInputFiles(IMAGE);
  await expect(works).toHaveCount(before + 1);
  await page.getByRole("button", { name: "Quitar esta foto" }).last().click();
  await expect(works).toHaveCount(before);
});

test("un barbero sin rol de administrador ve solo lo suyo", async ({ page }) => {
  await signIn(page, SEED.barber2);
  await expect(page).toHaveURL("/panel");
  await expect(page.getByRole("heading", { name: /^Hoy · / })).toBeVisible();
  await expect(page.getByLabel("Agenda de")).toHaveCount(0);
  await expectAccessible(page);

  await page.getByRole("link", { name: "Más" }).click();
  await expect(page.getByRole("link", { name: /Horario semanal/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Administración" })).toHaveCount(0);

  for (const path of ["/panel/servicios", "/panel/barberos", `/panel/barberos/${SEED.barberId}`]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
  }

  // No ve a los clientes del otro barbero.
  await page.goto("/panel/clientes");
  await expect(page.getByText("Todavía no tienes clientes.")).toBeVisible();
});

test("vino con su cobro, corrección del valor, anulación y liquidación de hoy", async ({
  page,
}) => {
  const name = `${E2E_PREFIX} Cobro ${Date.now()}`;
  await pastWalkInAppointment(name);
  await signIn(page, SEED.admin);

  const card = page.locator("li", { hasText: name });
  await expect(page.getByRole("heading", { name: /^Por cerrar/ })).toBeVisible();
  await card.getByRole("button", { name: "Vino", exact: true }).click();
  await expect(sheet(page).getByRole("heading", { name: "Cobro" })).toBeVisible();
  const started = Date.now();
  // El servicio de la semilla no tiene precio ([PENDIENTE]): el valor se escribe.
  await sheet(page).getByLabel("Valor cobrado").fill("30000");
  await expect(sheet(page).getByText("Para ti (50 %)")).toBeVisible();
  await expect(sheet(page).getByText(pesos(15000)).first()).toBeVisible();
  await expectAccessible(page);
  await sheet(page).getByRole("button", { name: "Guardar cobro" }).click();
  await expect(page.getByText("Guardaste el cobro")).toBeVisible();
  expect(Date.now() - started).toBeLessThan(10_000);
  await expect(card).toHaveCount(0);

  // Liquidación de hoy: la fila del cobro y los totales cuadran con la base.
  await page.goto(`/panel/liquidacion?periodo=hoy&barbero=${SEED.barberId}`);
  const row = page.getByRole("button", { name: new RegExp(name) });
  await expect(row).toContainText(pesos(30000));
  const expectTotals = async () => {
    const db = await todaySettlement();
    await expect(page.getByTestId("total")).toHaveText(pesos(db.amount));
    await expect(page.getByTestId("barbero")).toHaveText(pesos(db.barber));
    await expect(page.getByTestId("barberia")).toHaveText(pesos(db.business));
    expect(db.barber + db.business).toBe(db.amount);
  };
  await expectTotals();
  await expectAccessible(page);

  // Corregir el valor el mismo día.
  await row.click();
  await sheet(page).getByRole("button", { name: "Corregir valor" }).click();
  await sheet(page).getByLabel("Valor cobrado").fill("32000");
  await sheet(page).getByRole("button", { name: "Guardar el valor" }).click();
  await expect(page.getByText("Corregiste el cobro")).toBeVisible();
  await expect(row).toContainText(pesos(32000));
  await expectTotals();

  // Anular con motivo (administrador): sigue en la lista, tachado, y no cuenta.
  await row.click();
  await sheet(page).getByRole("button", { name: "Anular cobro" }).click();
  await sheet(page).getByLabel("Motivo").fill("Prueba del panel");
  await sheet(page).getByRole("button", { name: "Sí, anular el cobro" }).click();
  await expect(page.getByText("Anulaste el cobro")).toBeVisible();
  await expect(row).toContainText("Anulado: Prueba del panel");
  await expectTotals();
});

test("ficha del cliente: inasistencias, historial y notas privadas", async ({ page }) => {
  await signIn(page, SEED.admin, "/panel/clientes?q=aprobaci");
  await page.getByRole("link", { name: /Cliente con aprobación/ }).click();
  await expect(page.getByRole("heading", { name: "Cliente con aprobación" })).toBeVisible();
  await expect(page.getByText("Necesita aprobación")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reiniciar inasistencias" })).toBeVisible();

  const note = `${E2E_PREFIX} nota ${Date.now()}`;
  await page.getByLabel("Nota nueva").fill(note);
  await page.getByRole("button", { name: "Guardar nota" }).click();
  await expect(page.getByText(note)).toBeVisible();
  await expect(page.getByLabel("Nota nueva")).toHaveValue("");
  await expectAccessible(page);
  await page
    .locator("li", { hasText: note })
    .getByRole("button", { name: /Borrar/ })
    .click();
  await expect(page.getByText(note)).toHaveCount(0);
});

test("configuración, porcentajes y roles del administrador", async ({ page }) => {
  await signIn(page, SEED.admin, "/panel/configuracion");
  const lead = page.getByLabel("Anticipación mínima, en minutos");
  await lead.fill("abc");
  await page.getByRole("button", { name: "Guardar la agenda" }).click();
  await expect(page.getByText("Escribe los minutos (0 a 10.080)")).toBeVisible();
  await expect(lead).toHaveValue("abc");
  await lead.fill("60");
  await page.getByRole("button", { name: "Guardar la agenda" }).click();
  await expect(page.getByText("Guardaste las reglas de la agenda")).toBeVisible();
  await page.getByRole("button", { name: "Guardar los recordatorios" }).click();
  await expect(page.getByText("Guardaste los recordatorios")).toBeVisible();
  await expectAccessible(page);

  await page.goto("/panel/porcentajes");
  await page.getByLabel("Porcentaje de Barbero dos de prueba").fill("50");
  await page
    .locator("section", { hasText: "Barbero dos de prueba" })
    .getByRole("button", { name: "Guardar" })
    .click();
  await expect(page.getByText("Guardaste el porcentaje")).toBeVisible();

  await page.goto("/panel/roles");
  await expect(page.getByText(`${SEED.admin} (tú)`)).toBeVisible();
  await page.getByLabel("Correo de la cuenta").fill(SEED.customer2);
  await page.getByText("Administrador", { exact: true }).click();
  await page.getByRole("button", { name: "Dar el rol" }).click();
  await expect(page.getByText("Diste el rol")).toBeVisible();
  const member = page.locator("li", { hasText: SEED.customer2 });
  await member.getByRole("button", { name: /quitar el rol de administrador/ }).click();
  await expect(page.getByText("Quitaste el rol de administrador")).toBeVisible();
  await expect(member).toHaveCount(0);

  // Nadie se quita a sí mismo el rol de administrador.
  await page
    .locator("li", { hasText: `${SEED.admin} (tú)` })
    .getByRole("button", { name: /quitar el rol de administrador/ })
    .click();
  await expect(
    page.getByText("No puedes quitarte a ti mismo el rol de administrador"),
  ).toBeVisible();
  await expectAccessible(page);
});

test("el barbero ve su liquidación y no las pantallas de administración", async ({ page }) => {
  await signIn(page, SEED.barber2, "/panel/liquidacion");
  await expect(page.getByRole("heading", { name: "Liquidación" })).toBeVisible();
  await expect(page.getByLabel("Liquidación de")).toHaveCount(0);
  await expect(page.getByText("Para ti (50 % hoy)")).toBeVisible();
  for (const path of ["/panel/porcentajes", "/panel/configuracion", "/panel/roles"]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
  }
});
