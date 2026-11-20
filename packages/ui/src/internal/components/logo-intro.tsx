"use client";

import { useEffect, useRef } from "react";
import { cn } from "../cn";
import { Logo, type LogoProps } from "./logo";

/** Una vez por sesión del navegador: volver al inicio no repite el tijeretazo. */
const SEEN_KEY = "possos:logo-intro";

/** Cuánto se cierra el mango, en grados (hacia el aro izquierdo). */
const SNIP_DEG = 14;

/**
 * El monograma con un tijeretazo: el mango derecho se cierra hacia el otro aro y vuelve, en
 * 520 ms (docs/11, "Logo"). Sale después de hidratar y sin esconder nada: antes, y sin
 * JavaScript, el logo se ve quieto. No se mueve con `prefers-reduced-motion` ni si ya se vio en
 * esta sesión. Si el navegador no deja usar sessionStorage, se mueve cada vez.
 */
export function LogoIntro({ className, ...props }: LogoProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try {
      if (window.sessionStorage.getItem(SEEN_KEY)) return;
      window.sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Sin almacenamiento (modo privado estricto): se anima igual.
    }
    const handle = ref.current?.querySelector<SVGPathElement>('[data-part="handle"]');
    if (!handle || typeof handle.animate !== "function") return;
    const animation = handle.animate(
      [
        { transform: "rotate(0deg)" },
        {
          transform: `rotate(${SNIP_DEG}deg)`,
          offset: 0.35,
          easing: "cubic-bezier(0.3, 0, 0.2, 1)",
        },
        { transform: "rotate(0deg)" },
      ],
      { duration: 520, delay: 300, easing: "cubic-bezier(0.2, 0, 0, 1)" },
    );
    return () => animation.cancel();
  }, []);

  return (
    <span ref={ref} className={cn("inline-flex", className)}>
      <Logo {...props} />
    </span>
  );
}
