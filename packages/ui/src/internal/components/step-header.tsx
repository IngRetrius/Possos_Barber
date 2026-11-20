import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { cn } from "../cn";
import { Button } from "./button";

export interface StepHeaderProps {
  /** Paso actual, contando solo los pasos que el cliente va a recorrer. */
  step: number;
  total: number;
  /** Nombre del paso: "Horario", "Confirmar". */
  name: string;
  /** Destino del botón atrás. Si no hay, se usa `onBack`. */
  backHref?: string;
  onBack?: () => void;
  backLabel?: string;
  /** Lo que va a la derecha del encabezado (el botón ES/EN). */
  actions?: ReactNode;
  className?: string;
}

/** Encabezado de un flujo por pasos: botón atrás y "Paso n de m · Nombre". */
export function StepHeader({
  step,
  total,
  name,
  backHref,
  onBack,
  backLabel,
  actions,
  className,
}: StepHeaderProps) {
  const t = useTranslations("ui.stepHeader");
  const back = backLabel ?? t("back");
  const icon = <ArrowLeft strokeWidth={1.5} aria-hidden="true" />;
  return (
    <header
      data-slot="step-header"
      className={cn("flex min-h-14 items-center gap-1 px-2 pt-safe", className)}
    >
      {backHref ? (
        <Button asChild variant="ghost" size="icon">
          <Link href={backHref} aria-label={back}>
            {icon}
          </Link>
        </Button>
      ) : onBack ? (
        <Button variant="ghost" size="icon" aria-label={back} onClick={onBack}>
          {icon}
        </Button>
      ) : null}
      <p className="min-w-0 flex-1 text-label text-fg-muted tabular-nums">
        {t("step", { step, total })}
        <span aria-hidden="true"> · </span>
        <span className="sr-only">: </span>
        <span className="text-fg">{name}</span>
      </p>
      {actions}
    </header>
  );
}
