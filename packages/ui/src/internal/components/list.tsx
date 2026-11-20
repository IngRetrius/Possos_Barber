import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../cn";

/** Lista de filas en una tarjeta, separadas por bordes de 1 px. */
export function List({ className, ...props }: ComponentProps<"ul">) {
  return (
    <ul
      data-slot="list"
      className={cn(
        "divide-y divide-border overflow-hidden rounded-card border border-border bg-surface",
        className,
      )}
      {...props}
    />
  );
}

export interface ListRowProps {
  title: ReactNode;
  detail?: ReactNode;
  /** Valor a la derecha (precio, hora), en cifras tabulares. */
  value?: ReactNode;
  /** La fila lleva a otra página. */
  href?: string;
  /** La fila hace algo en la misma página (abrir una hoja, elegir un servicio). */
  onClick?: () => void;
  className?: string;
}

/** Fila de 64 px: título, detalle y valor a la derecha. Va dentro de `<List>`. */
export function ListRow({ title, detail, value, href, onClick, className }: ListRowProps) {
  const interactive = Boolean(href || onClick);
  const content = (
    <>
      <span className="grid min-w-0 flex-1 gap-0.5 text-left">
        <span className="truncate text-label text-fg">{title}</span>
        {detail ? <span className="truncate text-caption text-fg-muted">{detail}</span> : null}
      </span>
      {value ? <span className="shrink-0 text-label text-fg tabular-nums">{value}</span> : null}
      {interactive ? (
        <ChevronRight
          aria-hidden="true"
          strokeWidth={1.5}
          className="size-5 shrink-0 text-fg-muted"
        />
      ) : null}
    </>
  );
  const rowClass = cn(
    "flex min-h-16 w-full items-center gap-3 px-4 py-3",
    interactive &&
      "cursor-pointer transition-colors hover:bg-surface-2 active:bg-surface-2 focus-visible:-outline-offset-2",
    className,
  );

  return (
    <li data-slot="list-row">
      {href ? (
        <Link href={href} className={rowClass}>
          {content}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={rowClass}>
          {content}
        </button>
      ) : (
        <div className={rowClass}>{content}</div>
      )}
    </li>
  );
}

export interface ListDisclosureRowProps {
  title: ReactNode;
  detail?: ReactNode;
  /** Valor a la derecha (precio, hora), en cifras tabulares. */
  value?: ReactNode;
  /**
   * Filas con el mismo `group` forman un acordeón: abrir una cierra la otra (atributo `name` de
   * `<details>`; donde el navegador no lo soporte, cada una abre y cierra por su cuenta).
   */
  group?: string;
  /** Lo que aparece al abrir la fila: el detalle completo y su acción. */
  children: ReactNode;
  className?: string;
}

/**
 * Fila de 64 px que se despliega en el sitio, sin hoja ni página nueva. Usa `<details>`:
 * funciona sin JavaScript, con teclado y con lector de pantalla (anuncia abierto o cerrado).
 * Va dentro de `<List>`.
 */
export function ListDisclosureRow({
  title,
  detail,
  value,
  group,
  children,
  className,
}: ListDisclosureRowProps) {
  return (
    <li data-slot="list-disclosure-row">
      <details name={group} className={cn("group", className)}>
        <summary
          className={cn(
            "flex min-h-16 w-full cursor-pointer list-none items-center gap-3 px-4 py-3",
            "transition-colors hover:bg-surface-2 active:bg-surface-2 focus-visible:-outline-offset-2",
            "[&::-webkit-details-marker]:hidden",
          )}
        >
          <span className="grid min-w-0 flex-1 gap-0.5 text-left">
            <span className="truncate text-label text-fg">{title}</span>
            {detail ? <span className="truncate text-caption text-fg-muted">{detail}</span> : null}
          </span>
          {value ? <span className="shrink-0 text-label text-fg tabular-nums">{value}</span> : null}
          <ChevronDown
            aria-hidden="true"
            strokeWidth={1.5}
            className="size-5 shrink-0 text-fg-muted transition-transform group-open:rotate-180 motion-reduce:transition-none"
          />
        </summary>
        <div className="grid gap-4 px-4 pb-4">{children}</div>
      </details>
    </li>
  );
}
