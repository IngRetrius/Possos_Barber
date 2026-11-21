import type { Page } from "@playwright/test";

/**
 * Deja la página como queda en reposo antes de que axe la revise:
 *
 * - Muestra las secciones del inicio que esperan a que la persona baje (`ScrollReveal`, docs/11,
 *   "Inicio"). axe salta lo que tiene opacidad 0, así que sin esto dejaría de revisar todo lo que
 *   está debajo de la pantalla sin avisar.
 * - Espera a que terminen las animaciones finitas: la entrada de la portada, el tijeretazo del logo
 *   (docs/11, "Logo") y la de las secciones al bajar. axe mide el contraste con la opacidad del
 *   momento, así que a mitad de un fundido marcaría `color-contrast` aunque en reposo cumpla (pasó
 *   en CI el 20/11/2026 con la frase de la portada). Las animaciones infinitas no se esperan.
 */
export async function settleAnimations(page: Page) {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll<HTMLElement>('[data-reveal="pending"]')) {
      el.dataset.reveal = "";
    }
  });
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (a) => a.playState !== "running" || a.effect?.getComputedTiming().endTime === Infinity,
      ),
  );
}
