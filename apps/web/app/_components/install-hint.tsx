"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button, Sheet } from "@possos/ui";

/** Evento de Chrome en Android y escritorio; no está en los tipos del DOM. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * "Instalar la app" en "Listo" y en "Mis citas" (docs/11), nunca al entrar. No aparece si ya
 * está instalada. En Android usa el aviso del navegador (`beforeinstallprompt`, que Chrome manda
 * desde que existe el manifiesto de F8); en iPhone explica los pasos, porque Safari no tiene ese
 * aviso.
 */
const noSubscription = () => () => {};

/**
 * Con `lead`, el botón va con una frase arriba que explica para qué instalarla (en "Mis
 * citas"). Si la app ya está instalada, no se muestra nada, tampoco la frase.
 */
export function InstallHint({ lead }: { lead?: string } = {}) {
  // En el servidor no se sabe: no se muestra nada hasta hidratar.
  const iosBrowser = useSyncExternalStore(
    noSubscription,
    () => isIos() && !isStandalone(),
    () => false,
  );
  const [canPrompt, setCanPrompt] = useState(false);
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return;
    const onPrompt = (event: Event) => {
      event.preventDefault();
      deferred.current = event as BeforeInstallPromptEvent;
      setCanPrompt(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const withLead = (hint: React.ReactNode) =>
    lead ? (
      <section className="grid gap-3">
        <p className="text-body text-fg-muted">{lead}</p>
        {hint}
      </section>
    ) : (
      hint
    );

  if (canPrompt) {
    return withLead(
      <Button
        variant="secondary"
        onClick={() => {
          void deferred.current?.prompt();
          deferred.current = null;
          setCanPrompt(false);
        }}
      >
        Instalar la app
      </Button>,
    );
  }

  if (iosBrowser) {
    return withLead(
      <Sheet
        title="Instala la app en tu iPhone"
        trigger={<Button variant="secondary">Instalar la app</Button>}
      >
        <ol className="grid list-decimal gap-3 pl-5 text-body">
          <li>En Safari, toca el botón Compartir.</li>
          <li>Busca en la lista &quot;Agregar a inicio&quot; y tócalo.</li>
          <li>Toca &quot;Agregar&quot;. Possos Barber queda en tu pantalla de inicio.</li>
        </ol>
      </Sheet>,
    );
  }

  return null;
}
