import type { Page } from "@playwright/test";

/**
 * Espera a que terminen las animaciones finitas de la página: la entrada de la portada del inicio
 * y el tijeretazo del logo (docs/11, "Logo"). axe mide el contraste con la opacidad del momento,
 * así que a mitad de un fundido marcaría `color-contrast` aunque en reposo cumpla (pasó en CI el
 * 20/11/2026 con la frase de la portada). Las animaciones infinitas no se esperan.
 */
export async function settleAnimations(page: Page) {
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (a) => a.playState !== "running" || a.effect?.getComputedTiming().endTime === Infinity,
      ),
  );
}
