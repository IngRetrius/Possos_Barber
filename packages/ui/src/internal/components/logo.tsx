import type { CSSProperties } from "react";
import { cn } from "../cn";
import x1 from "../../assets/monograma.png";
import x2 from "../../assets/monograma@2x.png";
import x3 from "../../assets/monograma@3x.png";

/** Ancho / alto del monograma recortado de docs/marca/logo-possos-negro.png. */
const RATIO = x3.width / x3.height;

/*
 * El PNG se usa como máscara y el color lo pone el token --brand, así que cambiar el gris es
 * cambiar el token. Cuando el dueño entregue el SVG (decisión 11 de docs/10), se reemplazan los
 * tres PNG por ese archivo.
 */
const set = (fn: string) => `${fn}(url("${x1.src}") 1x, url("${x2.src}") 2x, url("${x3.src}") 3x)`;

export interface LogoProps {
  /** Alto en px. 28 en el encabezado de la página pública. */
  size?: number;
  /** Texto para el lector de pantalla. Vacío si el nombre ya está escrito al lado. */
  label?: string;
  className?: string;
}

/** Monograma de Possos Barber en el gris de la marca. */
export function Logo({ size = 28, label = "Possos Barber", className }: LogoProps) {
  const style: CSSProperties = {
    width: Math.round(size * RATIO),
    height: size,
    WebkitMaskImage: set("-webkit-image-set"),
    maskImage: set("image-set"),
    WebkitMaskSize: "contain",
    maskSize: "contain",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    forcedColorAdjust: "none",
  };
  return (
    <span
      data-slot="logo"
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      className={cn("inline-block shrink-0 bg-brand", className)}
      style={style}
    />
  );
}
