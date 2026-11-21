"use client";

import { useEffect } from "react";

/** Aparece y sube 12 px, como la portada pero con un poco más de recorrido (docs/11, "Inicio"). */
const KEYFRAMES: Keyframe[] = [{ opacity: 0, translate: "0 12px" }, {}];

/** 200 ms con el *ease-out* de `--ease-out` (docs/11, "Espacio, forma y movimiento"). */
const DURATION_MS = 200;
const EASING = "cubic-bezier(0.2, 0, 0, 1)";

/** El título entra primero y el resto 70 ms después, el mismo escalonado de la portada. */
const STAGGER_MS = 70;

/** Si entran varias secciones a la vez, como mucho tres en cadena. */
const MAX_CHAINED = 3;

/** Se dispara un poco antes del borde inferior, donde la persona ya está mirando. */
const ROOT_MARGIN = "0px 0px -8% 0px";

/**
 * Hace aparecer al bajar las secciones marcadas con `data-reveal=""` (docs/11, "Inicio"). No pinta
 * nada: se monta una vez en la página y vigila todas con un solo `IntersectionObserver`.
 *
 * - Solo esconde lo que está debajo de la pantalla cuando corre (`data-reveal="pending"`): lo que
 *   ya se ve al cargar, o al volver atrás, no parpadea, y la foto que cuenta para el LCP no espera.
 * - Sin JavaScript, antes de hidratar y con `prefers-reduced-motion` no se esconde nada.
 * - Cada sección aparece una sola vez. Los hijos directos se animan con `Element.animate` (opacidad
 *   y `translate`, que corren en el compositor), así que al terminar no queda estado que se repita
 *   si React vuelve a pintar un hijo.
 * - Una sección que se saltó (un salto con el teclado o la posición restaurada) y entra por arriba
 *   aparece sin animarse: subir 12 px mientras la página baja se vería al revés.
 */
export function ScrollReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver !== "function") return;

    const pending = [...document.querySelectorAll<HTMLElement>("[data-reveal]")].filter(
      (el) => el.getBoundingClientRect().top > window.innerHeight,
    );
    if (!pending.length) return;
    for (const el of pending) el.dataset.reveal = "pending";

    const observer = new IntersectionObserver(
      (entries) => {
        const entering = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        let chained = 0;
        for (const { target, boundingClientRect } of entering) {
          observer.unobserve(target);
          const section = target as HTMLElement;
          // Alguien más ya la mostró (las pruebas de accesibilidad, por ejemplo).
          if (section.dataset.reveal !== "pending") continue;
          if (boundingClientRect.top >= 0 && typeof section.animate === "function") {
            const base = Math.min(chained++, MAX_CHAINED - 1) * STAGGER_MS;
            [...section.children].forEach((child, i) => {
              child.animate(KEYFRAMES, {
                duration: DURATION_MS,
                easing: EASING,
                delay: base + (i === 0 ? 0 : STAGGER_MS),
                // Mientras espera su turno se queda en el primer cuadro: sin parpadeo.
                fill: "backwards",
              });
            });
          }
          section.dataset.reveal = "";
        }
      },
      { rootMargin: ROOT_MARGIN },
    );
    for (const el of pending) observer.observe(el);

    return () => {
      observer.disconnect();
      // Que nada quede escondido si el efecto se desmonta antes de que aparezca.
      for (const el of pending) {
        if (el.dataset.reveal === "pending") el.dataset.reveal = "";
      }
    };
  }, []);

  return null;
}
