import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Logo } from "@possos/ui";
import { LocaleSwitch } from "./locale-switch";

/**
 * Encabezado de las pantallas de cuenta: el logo vuelve al inicio y, a la derecha, lo que pase la
 * página y el botón ES/EN (docs/11, "Idiomas").
 */
export function SiteHeader({ children }: { children?: ReactNode }) {
  const t = useTranslations("web.common.header");
  return (
    <header className="flex min-h-14 items-center justify-between gap-2 px-gutter pt-safe">
      <Link href="/" className="inline-flex min-h-12 min-w-12 items-center">
        <Logo label={t("home")} />
      </Link>
      <div className="flex items-center gap-1">
        {children}
        <LocaleSwitch />
      </div>
    </header>
  );
}
