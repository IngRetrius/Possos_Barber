"use client";

import { useEffect, useRef } from "react";
import { cn } from "../cn";
import { Logo, type LogoProps } from "./logo";

/** Cuánto se cierra el mango, en grados (hacia el aro izquierdo). */
const SNIP_DEG = 14;

/** El primero sale poco después de hidratar. */
const FIRST_MS = 300;

/** Después, uno cada 8 s (pedido de Juan, 20/11/2026: "es algo pequeñito"). */
const EVERY_MS = 8000;

const KEYFRAMES: Keyframe[] = [
  { transform: "rotate(0deg)" },
  { transform: `rotate(${SNIP_DEG}deg)`, offset: 0.35, easing: "cubic-bezier(0.3, 0, 0.2, 1)" },
  { transform: "rotate(0deg)" },
];

const TIMING: KeyframeAnimationOptions = { duration: 520, easing: "cubic-bezier(0.2, 0, 0, 1)" };

/** Lo que cuenta como que la persona empezó a usar la página: tocar, teclear o desplazarse. */
const INTERACTIONS = ["pointerdown", "keydown", "wheel", "touchmove"] as const;

/**
 * El monograma con su tijeretazo: el mango derecho se cierra hacia el otro aro y vuelve, en
 * 520 ms (docs/11, "Logo"). Sale 300 ms después de hidratar y se repite cada 8 s mientras el logo
 * está en pantalla y la pestaña se ve. Al primer toque, tecla o desplazamiento se queda quieto:
 * WCAG 2.2.2 pide que lo que se mueve solo por más de 5 s se pueda detener. No esconde nada
 * (antes de hidratar y sin JavaScript se ve quieto) y no se mueve con `prefers-reduced-motion`.
 */
export function LogoIntro({ className, ...props }: LogoProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = ref.current;
    const handle = root?.querySelector<SVGPathElement>('[data-part="handle"]');
    if (!root || !handle || typeof handle.animate !== "function") return;

    let timer: number | undefined;
    let onScreen = false;
    let snips = 0;
    let animation: Animation | undefined;

    const schedule = () => {
      window.clearTimeout(timer);
      if (!onScreen || document.hidden) return;
      timer = window.setTimeout(
        () => {
          animation = handle.animate(KEYFRAMES, TIMING);
          snips++;
          schedule();
        },
        snips === 0 ? FIRST_MS : EVERY_MS,
      );
    };

    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry?.isIntersecting ?? false;
      schedule();
    });
    observer.observe(root);
    document.addEventListener("visibilitychange", schedule);

    // Deja de repetirse, pero el tijeretazo que esté en curso termina.
    const stop = () => {
      window.clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener("visibilitychange", schedule);
      for (const type of INTERACTIONS) window.removeEventListener(type, stop);
    };
    for (const type of INTERACTIONS) window.addEventListener(type, stop, { passive: true });

    return () => {
      stop();
      animation?.cancel();
    };
  }, []);

  return (
    <span ref={ref} className={cn("inline-flex", className)}>
      <Logo {...props} />
    </span>
  );
}
