"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

/** Tiempo máximo que se espera a que la hoja quite su entrada del historial. */
const POPSTATE_TIMEOUT_MS = 500;

/**
 * Cerrar una hoja y después navegar (F1 y F3): al cerrarse, la hoja quita su entrada del
 * historial con `history.back()`. Si la navegación sale antes de ese `popstate`, la vuelta atrás
 * la deshace. Se espera el `popstate` o 500 ms.
 */
export function useCloseThenNavigate(closeSheet: () => void) {
  const router = useRouter();

  const close = useCallback(() => closeSheet(), [closeSheet]);

  const navigate = useCallback(
    (href: string) => {
      let done = false;
      const go = () => {
        if (done) return;
        done = true;
        window.removeEventListener("popstate", go);
        router.push(href);
      };
      window.addEventListener("popstate", go);
      setTimeout(go, POPSTATE_TIMEOUT_MS);
      closeSheet();
    },
    [closeSheet, router],
  );

  return { close, navigate };
}
