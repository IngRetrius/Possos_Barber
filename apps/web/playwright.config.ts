import { defineConfig, devices } from "@playwright/test";

/**
 * Pruebas de punta a punta a 390 px (regla 9). Corren contra `next dev` porque la página de
 * muestras solo existe en desarrollo. Localmente reutiliza un `pnpm dev` que ya esté corriendo.
 */
const PORT = 3000;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
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
    command: `pnpm exec next dev --port ${PORT}`,
    url: `http://localhost:${PORT}/muestras`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
