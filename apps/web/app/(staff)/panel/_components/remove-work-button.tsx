"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button, toast } from "@possos/ui";
import { deletePortfolioAction } from "../_actions/admin";

/**
 * Quita un trabajo del portafolio. Es un botón de cliente y no un `<form>` porque va dentro del
 * formulario del perfil del barbero (no se anidan formularios).
 */
export function RemoveWorkButton({ id }: { id: string }) {
  const t = useTranslations("web.panel.removeWork");
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      className="h-11 w-full px-2 text-danger"
      disabled={pending}
      aria-busy={pending}
      onClick={() =>
        start(async () => {
          const result = await deletePortfolioAction(id);
          setFailed(!result.ok);
          if (!result.ok) toast.error(result.error ?? t("failed"));
        })
      }
    >
      {pending ? t("pending") : failed ? t("retry") : t("remove")}
      <span className="sr-only">{t("hint")}</span>
    </Button>
  );
}
