"use client";

import { useTranslations } from "next-intl";
import { Button } from "@possos/ui";

/** Vuelve a pedir la página donde está la persona (la pantalla sin conexión no tiene ruta propia). */
export function ReloadButton() {
  const t = useTranslations("web.common");
  return <Button onClick={() => window.location.reload()}>{t("retry")}</Button>;
}
