import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "@possos/ui";
import { LocaleSwitch } from "../../../_components/locale-switch";

/** Encabezado de una pantalla del panel que no es pestaña: atrás y título. */
export function PanelHeader({
  title,
  backHref,
  backLabel,
  children,
}: {
  title: string;
  backHref: string;
  backLabel?: string;
  /** Acción a la derecha. */
  children?: ReactNode;
}) {
  const t = useTranslations("web.panel");
  return (
    <header className="flex min-h-14 items-center gap-1 px-2 pt-safe">
      <Button asChild variant="ghost" size="icon">
        <Link href={backHref} aria-label={backLabel ?? t("back")}>
          <ArrowLeft strokeWidth={1.5} aria-hidden="true" />
        </Link>
      </Button>
      <h1 className="min-w-0 flex-1 truncate text-heading">{title}</h1>
      {children}
      <LocaleSwitch />
    </header>
  );
}
