import { cn } from "../cn";
import { LOGO_BODY, LOGO_HANDLE, LOGO_HANDLE_PIVOT, LOGO_VIEWBOX } from "./logo-paths";

/** Ancho / alto del monograma. */
const RATIO = LOGO_VIEWBOX.width / LOGO_VIEWBOX.height;

export interface LogoProps {
  /** Alto en px. 28 en los encabezados. */
  size?: number;
  /** Texto para el lector de pantalla. Vacío si el nombre ya está escrito al lado. */
  label?: string;
  className?: string;
}

/**
 * Monograma de Possos Barber en el gris de la marca (docs/11, "Logo"). Es un SVG en línea: se ve
 * nítido a cualquier tamaño y el color sale de `currentColor` (`text-brand`), así que cambiar el
 * gris es cambiar el token, y con colores forzados toma el color del sistema. El mango derecho es
 * una pieza aparte (`data-part="handle"`) para que LogoIntro lo pueda mover.
 */
export function Logo({ size = 28, label = "Possos Barber", className }: LogoProps) {
  return (
    <svg
      data-slot="logo"
      viewBox={`0 0 ${LOGO_VIEWBOX.width} ${LOGO_VIEWBOX.height}`}
      width={Math.round(size * RATIO)}
      height={size}
      fill="currentColor"
      fillRule="evenodd"
      focusable="false"
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      className={cn("inline-block shrink-0 text-brand", className)}
    >
      <path d={LOGO_BODY} />
      <path
        data-part="handle"
        d={LOGO_HANDLE}
        style={{
          transformBox: "view-box",
          transformOrigin: `${LOGO_HANDLE_PIVOT.x}px ${LOGO_HANDLE_PIVOT.y}px`,
        }}
      />
    </svg>
  );
}
