import { defineConfig, devices } from "@playwright/test";

/**
 * Pruebas de punta a punta a 390 px (regla 9). Corren contra `next dev` porque la página de
 * muestras solo existe en desarrollo. Localmente reutiliza un `pnpm dev` que ya esté corriendo.
 * `E2E_PORT` cambia el puerto, para probar una rama en otro worktree sin chocar con el 3000.
 */
const PORT = Number(process.env.E2E_PORT ?? 3000);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // Un solo worker: reserva.spec y panel.spec reservan horas reales y crean servicios en la misma
  // semilla; en paralelo se pisarían (un servicio de más cambia el flujo de reserva).
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  // `next dev` compila cada ruta la primera vez que se abre: con el servidor en frío (siempre en
  // CI) la primera visita a /registrarse o /perfil tarda más que los 5 s por omisión.
  expect: { timeout: 15_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    // El service worker de la PWA (F8) solo corre en pwa.spec, que lo permite. En las demás,
    // las navegaciones van directo a la red, como antes de F8.
    serviceWorkers: "block",
    // Un celular en español de Colombia: sin cookie, la app toma el idioma del dispositivo
    // (docs/11, "Idiomas"), y Chromium por omisión dice inglés.
    locale: "es-CO",
  },
  projects: [
    {
      name: "celular-390",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: `next dev --port ${PORT}`,
    url: `http://localhost:${PORT}/muestras`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Sin esto, el servidor de desarrollo de Next no se apaga al terminar y el job de CI se cuelga.
    gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
  },
});
