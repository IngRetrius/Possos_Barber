"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState, type MouseEvent } from "react";
import { BottomBar, Button, cn, LinkPending } from "@possos/ui";

interface HomeBookBarProps {
  /** A dónde lleva "Reservar" sin JavaScript (o con un solo servicio, al horario). */
  href: string;
  /** Id de la sección de servicios: "Reservar" sube a ella. */
  targetId: string;
  /**
   * Ids de lo que ya tiene su propio "Reservar" (la lista de servicios, "Próxima hora libre"):
   * mientras alguno se ve, la barra se esconde. Los que no estén en la página se ignoran; la
   * lista siempre está.
   */
  hideWhileVisible: string[];
  /** Con más de un servicio, "Reservar" sube a la lista en vez de abrir otra página con la misma. */
  scrollToTarget: boolean;
}

type BarState = "pending" | "visible" | "hidden";

/**
 * Barra "Reservar" del inicio (docs/11). Mientras la lista de servicios o "Próxima hora libre"
 * están en pantalla se esconde, porque ya tienen sus horas y su botón y no deben verse dos
 * "Reservar". Al bajar al barbero o al mapa vuelve a aparecer.
 *
 * - Antes de hidratar (`pending`) se esconde solo si el navegador corre JavaScript
 *   (`scripting: enabled`): sin JavaScript queda fija y lleva a `href`, como siempre.
 * - Escondida es `inert` e `invisible` (al terminar de desvanecerse): no se enfoca con el teclado
 *   ni la lee el lector de pantalla.
 * - Entra en 200 ms con *ease-out*; con `prefers-reduced-motion`, solo cambia la opacidad.
 */
export function HomeBookBar({
  href,
  targetId,
  hideWhileVisible,
  scrollToTarget,
}: HomeBookBarProps) {
  const t = useTranslations("web.common");
  const [state, setState] = useState<BarState>("pending");

  // Un string para que el efecto no se repita en cada render por un arreglo nuevo.
  const watched = hideWhileVisible.join(" ");

  useEffect(() => {
    // IntersectionObserver está en todos los navegadores que soporta la app.
    const targets = watched
      .split(" ")
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    // La lista de servicios siempre se pinta en el inicio, así que hay al menos uno.
    if (!targets.length) return;
    const onScreen = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) onScreen.add(entry.target);
        else onScreen.delete(entry.target);
      }
      setState(onScreen.size > 0 ? "hidden" : "visible");
    });
    for (const target of targets) observer.observe(target);
    return () => observer.disconnect();
  }, [watched]);

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
          {t("book")}
          <LinkPending />
        </Link>
      </Button>
    </BottomBar>
  );
}
