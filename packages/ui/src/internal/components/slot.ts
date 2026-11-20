import { cn } from "../cn";

/**
 * Cómo se ve una hora (docs/11, "Espacio, forma y movimiento"): libre, un relleno un tono más
 * claro que la superficie y sin contorno, para que una cuadrícula de horas no sea una pared de
 * rectángulos (20/11/2026); el contorno aparece al pasar o presionar. Elegida, el amarillo. La
 * usan la cuadrícula del paso de horario (`SlotGrid`) y las horas rápidas del inicio, para que se
 * vean igual. Va aparte de `slot-grid.tsx` porque ese es de cliente y las horas rápidas se pintan
 * en el servidor.
 */
export function slotClass(selected = false): string {
  return cn(
    "relative flex h-12 items-center justify-center rounded-card border px-1 text-label whitespace-nowrap tabular-nums transition-colors",
    selected
      ? "border-accent bg-accent text-accent-fg"
      : "border-transparent bg-surface-2 text-fg hover:border-border-strong active:border-border-strong",
  );
}
