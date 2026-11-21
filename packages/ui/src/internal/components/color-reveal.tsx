"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "../cn";

export interface ColorRevealProps {
  children: ReactNode;
  className?: string;
}

/**
 * Las fotos de adentro se ven en gris y toman color, con un acercamiento del 5 %, cuando la persona
 * pasa el dedo o el mouse por encima (docs/11, "El barbero"; los estilos están en styles.css). Solo
 * cambian las imágenes: el texto que va encima conserva su color. El contenedor debe recortar
 * (`overflow-hidden`) para que la foto que crece no se salga.
 *
 * - Con mouse: mientras está encima (styles.css, solo en pantallas con `hover`).
 * - Con el dedo: apenas el dedo toca la foto o pasa por encima, también si viene deslizando la
 *   página desde otra parte (pedido de Juan, 20/11/2026). Se queda en color hasta que la foto sale
 *   de la pantalla; al volver, está otra vez en gris. Si el dedo baja la página por fuera de la
 *   foto, sigue en gris.
 *
 * Escucha el dedo en todo el documento, porque un toque que empieza fuera de la foto no le llega a
 * ella, pero solo mientras la foto está en pantalla. Los oyentes son pasivos: no frenan el scroll.
 * El color no lleva información. Con movimiento reducido el cambio es inmediato.
 */
export function ColorReveal({ children, className }: ColorRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [colored, setColored] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let visible = typeof IntersectionObserver !== "function";
    const observer =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver(([entry]) => {
            visible = Boolean(entry?.isIntersecting);
            if (!visible) setColored(false);
          })
        : null;
    observer?.observe(el);

    const onTouch = (event: TouchEvent) => {
      if (!visible) return;
      const rect = el.getBoundingClientRect();
      for (const touch of event.touches) {
        if (
          touch.clientX >= rect.left &&
          touch.clientX <= rect.right &&
          touch.clientY >= rect.top &&
          touch.clientY <= rect.bottom
        ) {
          setColored(true);
          return;
        }
      }
    };
    document.addEventListener("touchstart", onTouch, { passive: true });
    document.addEventListener("touchmove", onTouch, { passive: true });
    return () => {
      observer?.disconnect();
      document.removeEventListener("touchstart", onTouch);
      document.removeEventListener("touchmove", onTouch);
    };
  }, []);

  return (
    <div
      ref={ref}
      data-slot="color-reveal"
      data-color={colored ? "" : undefined}
      className={cn(className)}
    >
      {children}
    </div>
  );
}
