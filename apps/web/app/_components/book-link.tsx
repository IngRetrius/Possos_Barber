"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { MouseEvent } from "react";
import { Button, LinkPending } from "@possos/ui";

export interface BookLinkProps {
  /** A dónde lleva sin JavaScript (o con un solo servicio, al horario). */
  href: string;
  /** Id de la sección de servicios a la que sube. */
  targetId: string;
  /** Con más de un servicio, sube a la lista en vez de abrir otra página con la misma. */
  scrollToTarget: boolean;
  className?: string;
}

/**
 * "Reservar" del inicio, en amarillo: el de la portada y el de la barra fija (docs/11). Con
 * JavaScript y `scrollToTarget`, sube a la lista de servicios y pone el foco en su título, para
 * que el teclado y el lector de pantalla sigan desde ahí.
 */
export function BookLink({ href, targetId, scrollToTarget, className }: BookLinkProps) {
  const t = useTranslations("web.common");

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!scrollToTarget) return;
    const target = document.getElementById(targetId);
    if (!target) return;
    event.preventDefault();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    target.querySelector<HTMLElement>("[data-scroll-focus]")?.focus({ preventScroll: true });
  };

  return (
    <Button asChild className={className}>
      <Link href={href} onClick={onClick}>
        {t("book")}
        <LinkPending />
      </Link>
    </Button>
  );
}
