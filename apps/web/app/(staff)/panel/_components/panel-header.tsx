import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@possos/ui";

/** Encabezado de una pantalla del panel que no es pestaña: atrás y título. */
export function PanelHeader({
  title,
  backHref,
  backLabel = "Atrás",
  children,
}: {
  title: string;
  backHref: string;
  backLabel?: string;
  /** Acción a la derecha. */
  children?: ReactNode;
}) {
  return (
    <header className="flex min-h-14 items-center gap-1 px-2 pt-safe">
      <Button asChild variant="ghost" size="icon">
        <Link href={backHref} aria-label={backLabel}>
          <ArrowLeft strokeWidth={1.5} aria-hidden="true" />
        </Link>
      </Button>
      <h1 className="min-w-0 flex-1 truncate text-heading">{title}</h1>
      {children}
    </header>
  );
}
