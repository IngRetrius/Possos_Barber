import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../cn";

/*
 * Las barras inferiores son `sticky`: van como último hijo de un contenedor
 * `flex min-h-dvh flex-col` y quedan pegadas abajo sin tapar el contenido ni pedir un espaciador.
 */

export interface BottomBarProps extends ComponentProps<"div"> {
  /** Línea arriba del botón ("jue 20 nov · 3:00 p. m."). Se anuncia cuando cambia. */
  summary?: ReactNode;
}

/** Barra fija inferior con un resumen opcional y la acción principal. Respeta la zona segura. */
export function BottomBar({ summary, children, className, ...props }: BottomBarProps) {
  return (
    <div
      data-slot="bottom-bar"
      className={cn(
        "sticky bottom-0 z-30 mt-auto border-t border-border bg-bg px-gutter pt-3 pb-safe-3",
        className,
      )}
      {...props}
    >
      <p aria-live="polite" className="mb-3 text-label tabular-nums empty:hidden">
        {summary}
      </p>
      <div className="grid gap-2 [&>*]:w-full">{children}</div>
    </div>
  );
}

export interface TabBarItem {
  href: string;
  label: string;
  /** Ícono de Lucide (20 px, trazo 1,5); se pinta junto a la etiqueta. */
  icon: ReactNode;
  current?: boolean;
}

/** Navegación inferior de 4 pestañas con ícono y etiqueta. El acento no se usa aquí. */
export function TabBar({
  items,
  label,
  className,
}: {
  items: TabBarItem[];
  label?: string;
  className?: string;
}) {
  const t = useTranslations("ui.tabBar");
  return (
    <nav
      aria-label={label ?? t("label")}
      data-slot="tab-bar"
      className={cn("sticky bottom-0 z-30 mt-auto border-t border-border bg-bg pb-safe", className)}
    >
      <ul className="grid grid-cols-4">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={item.current ? "page" : undefined}
              className={cn(
                "relative flex h-16 flex-col items-center justify-center gap-1 text-caption transition-colors",
                "[&_svg]:size-5 [&_svg]:stroke-[1.5]",
                item.current
                  ? "font-medium text-fg before:absolute before:inset-x-6 before:top-0 before:h-0.5 before:rounded-pill before:bg-fg"
                  : "text-fg-muted hover:text-fg",
              )}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
