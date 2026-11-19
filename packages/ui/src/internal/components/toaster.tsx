"use client";

import { Toaster as Sonner, toast } from "sonner";

/**
 * Avisos cortos (Sonner). Arriba, para no chocar con la barra inferior. Para errores que piden
 * una acción se usa `InlineError` en su lugar, no un aviso.
 */
export function Toaster() {
  return (
    <Sonner
      position="top-center"
      theme="dark"
      offset={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
      mobileOffset={{ top: "calc(env(safe-area-inset-top) + 12px)", left: "16px", right: "16px" }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-start gap-3 rounded-card border border-border-strong bg-surface-2 p-4 text-fg",
          title: "text-label",
          description: "text-caption text-fg-muted",
          error: "[&_[data-title]]:text-danger",
          actionButton: "ml-auto h-12 shrink-0 rounded-card px-4 text-label text-fg underline",
        },
      }}
    />
  );
}

export { toast };
