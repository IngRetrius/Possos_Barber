import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../cn";

const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-card",
    "text-label whitespace-nowrap select-none transition-colors",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        /** Amarillo. Una sola vez por zona: la acción que avanza. */
        // Presionado baja un matiz (`--accent-pressed`): el amarillo con transparencia se veía oliva.
        // Deshabilitado no se ve amarillo apagado: pasa a gris, con texto que sigue legible.
        primary:
          "bg-accent text-accent-fg hover:bg-accent-pressed active:bg-accent-pressed disabled:bg-surface-2 disabled:text-fg-subtle disabled:opacity-100",
        secondary: "border border-border-strong text-fg hover:bg-surface-2 active:bg-surface-2",
        ghost: "text-fg hover:bg-surface-2 active:bg-surface-2",
        danger:
          "bg-danger text-accent-fg active:bg-danger/85 disabled:bg-surface-2 disabled:text-fg-subtle disabled:opacity-100",
      },
      size: {
        /** 48 px de alto. */
        default: "h-12 px-5",
        /** Ícono suelto: 44 × 44 px, con el área táctil ampliada a 48 px. */
        icon: "size-11 after:absolute after:-inset-0.5",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export interface ButtonProps extends ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  /** Pinta como botón el hijo (por ejemplo, un `<Link>`). */
  asChild?: boolean;
}

/** Botón de 48 px. Un ícono suelto (`size="icon"`) necesita `aria-label`. */
export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot={size === "icon" ? "icon-button" : "button"}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
