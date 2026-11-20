"use client";

import Link from "next/link";
import { useEffect, useState, type MouseEvent } from "react";
import { BottomBar, Button, cn, LinkPending } from "@possos/ui";

interface HomeBookBarProps {
  /** A dónde lleva "Reservar" sin JavaScript (o con un solo servicio, al horario). */
  href: string;
  /** Id de la sección de servicios: mientras se ve, la barra se esconde. */
  targetId: string;
  /** Con más de un servicio, "Reservar" sube a la lista en vez de abrir otra página con la misma. */
  scrollToTarget: boolean;
}

type BarState = "pending" | "visible" | "hidden";

/**
 * Barra "Reservar" del inicio (docs/11). Mientras la lista de servicios está en pantalla se
 * esconde, porque cada servicio ya tiene sus horas y su botón y no deben verse dos "Reservar". Al
 * bajar al barbero o al mapa vuelve a aparecer.
 *
 * - Antes de hidratar (`pending`) se esconde solo si el navegador corre JavaScript
 *   (`scripting: enabled`): sin JavaScript queda fija y lleva a `href`, como siempre.
 * - Escondida es `inert` e `invisible` (al terminar de desvanecerse): no se enfoca con el teclado
 *   ni la lee el lector de pantalla.
 * - Entra en 200 ms con *ease-out*; con `prefers-reduced-motion`, solo cambia la opacidad.
 */
export function HomeBookBar({ href, targetId, scrollToTarget }: HomeBookBarProps) {
  const [state, setState] = useState<BarState>("pending");

  useEffect(() => {
    // La sección siempre se pinta en el inicio; IntersectionObserver está en todos los navegadores
    // que soporta la app.
    const target = document.getElementById(targetId);
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => {
      setState(entry?.isIntersecting ? "hidden" : "visible");
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!scrollToTarget) return;
    const target = document.getElementById(targetId);
    if (!target) return;
    event.preventDefault();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    // El foco va al título de la lista: el teclado y el lector de pantalla siguen desde ahí.
    target.querySelector<HTMLElement>("[data-scroll-focus]")?.focus({ preventScroll: true });
  };

  return (
    <BottomBar
      data-state={state}
      inert={state === "hidden"}
      className={cn(
        "transition-[translate,opacity,visibility] duration-200 ease-out motion-reduce:transition-[opacity,visibility]",
        state === "hidden" && "pointer-events-none invisible translate-y-full opacity-0",
        state === "pending" &&
          "[@media(scripting:enabled)]:pointer-events-none [@media(scripting:enabled)]:invisible [@media(scripting:enabled)]:translate-y-full [@media(scripting:enabled)]:opacity-0",
      )}
    >
      <Button asChild>
        <Link href={href} onClick={onClick}>
          Reservar
          <LinkPending />
        </Link>
      </Button>
    </BottomBar>
  );
}
