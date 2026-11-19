import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@possos/ui";

/** Encabezado de las pantallas de cuenta: el logo vuelve al inicio. */
export function SiteHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="flex min-h-14 items-center justify-between gap-2 px-gutter pt-safe">
      <Link href="/" className="inline-flex min-h-12 min-w-12 items-center">
        <Logo label="Possos Barber, ir al inicio" />
      </Link>
      {children}
    </header>
  );
}
