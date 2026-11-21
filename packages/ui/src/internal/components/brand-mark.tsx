import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { cn } from "../cn";

/*
 * Marcas a mano en amarillo neón, las de los videos de Instagram (docs/11, "Marcas"). Son trazos
 * rellenos, no líneas: un pincel que adelgaza en las puntas. Decorativas: `aria-hidden` y sin
 * texto propio, así que el lector oye solo las palabras.
 */

/** Subrayado largo, para estirarse bajo una o dos palabras (viewBox 200 × 12). */
const UNDERLINE =
  "M3 7.2C46 3.6 118 2.6 196.6 4.2c2.2.1 2.2 3 .1 3.2C130 8.6 62 9.2 4.4 10.4c-2.3 0-3.4-2.9-1.4-3.2Z";

/** Trazo corto bajo el título de una sección (viewBox 45 × 8). */
const TITLE_MARK =
  "M2 4.6C14 2.6 30 2 42.6 2.6c1.6.1 1.6 2.4 0 2.6C30 6 15 6.4 3 6.9c-1.7.1-2.6-2-1-2.3Z";

export interface HighlightProps {
  children: ReactNode;
  /** Cuándo empieza a dibujarse, en ms (por ejemplo, después de que la frase sube). */
  delay?: number;
  className?: string;
}

/**
 * Subraya a mano una palabra clave, como "más viral" en los videos. El trazo se dibuja de izquierda
 * a derecha en 360 ms (`animate-draw`); con movimiento reducido ya está dibujado. Mide en `em`, así
 * que sirve igual en el cuerpo (16 px) que en un título (28 px). Una sola por pantalla.
 */
export function Highlight({ children, delay = 0, className }: HighlightProps) {
  const style: CSSProperties | undefined = delay ? { animationDelay: `${delay}ms` } : undefined;
  return (
    <span className={cn("relative inline-block whitespace-nowrap text-fg", className)}>
      {children}
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 200 12"
        preserveAspectRatio="none"
        style={style}
        className="pointer-events-none absolute -bottom-[0.4em] -left-[2%] h-[0.55em] w-[104%] animate-draw text-accent"
      >
        <path fill="currentColor" d={UNDERLINE} />
      </svg>
    </span>
  );
}

/**
 * Título de una sección del inicio: en mayúsculas espaciadas, como el nombre de la portada, con un
 * trazo corto amarillo debajo. Si la sección aparece al bajar (`ScrollReveal`), el trazo se dibuja
 * después de que sube el título (styles.css, `title-mark`).
 */
export function SectionTitle({ className, children, ...props }: ComponentProps<"h2">) {
  return (
    <h2 className={cn("text-heading tracking-[0.06em] uppercase", className)} {...props}>
      {children}
      <svg
        data-slot="title-mark"
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 45 8"
        className="mt-1 block h-2 w-11 text-accent"
      >
        <path fill="currentColor" d={TITLE_MARK} />
      </svg>
    </h2>
  );
}
