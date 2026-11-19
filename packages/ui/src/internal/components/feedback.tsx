import { CircleAlert } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../cn";

/** Bloque gris mientras carga. Se muestra solo si la respuesta tarda más de 300 ms (docs/11). */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      data-slot="skeleton"
      className={cn("animate-pulse rounded-card bg-surface-2", className)}
      {...props}
    />
  );
}

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  /** Normalmente un `<Button>`. */
  action?: ReactNode;
  className?: string;
}

/** Estado vacío: "Todavía no tienes citas" y una acción. */
export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn("grid gap-2 rounded-card border border-border px-4 py-6", className)}
    >
      <p className="text-heading">{title}</p>
      {description ? <p className="text-body text-fg-muted">{description}</p> : null}
      {action ? <div className="mt-2 grid">{action}</div> : null}
    </div>
  );
}

export interface InlineErrorProps {
  children: ReactNode;
  /** Acción para reintentar, normalmente un `<Button variant="secondary">`. */
  action?: ReactNode;
  className?: string;
}

/** Error en su lugar, no en un aviso genérico. Se anuncia al aparecer. */
export function InlineError({ children, action, className }: InlineErrorProps) {
  return (
    <div data-slot="inline-error" className={cn("grid gap-3", className)}>
      <p role="alert" className="flex gap-2 text-body text-danger">
        <CircleAlert aria-hidden="true" strokeWidth={1.5} className="mt-0.5 size-5 shrink-0" />
        <span>{children}</span>
      </p>
      {action ? <div className="grid">{action}</div> : null}
    </div>
  );
}

export type StatusTone = "success" | "warning" | "danger" | "neutral";

const TONE: Record<StatusTone, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  neutral: "text-fg-muted",
};

/**
 * Punto y texto de un estado. El color nunca va solo: el texto dice el estado.
 * `ui` no conoce las citas; el paso de estado de la cita a tono y texto vive en `booking`
 * (ver la tabla de la página de muestras).
 */
export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: string;
  className?: string;
}) {
  return (
    <span
      data-slot="status-badge"
      data-tone={tone}
      className={cn(
        "inline-flex items-center gap-1.5 text-caption font-medium",
        TONE[tone],
        className,
      )}
    >
      <span aria-hidden="true" className="size-2 shrink-0 rounded-pill bg-current" />
      {children}
    </span>
  );
}
