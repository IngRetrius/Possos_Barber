"use client";

import { useLinkStatus } from "next/link";
import { cn } from "../cn";

/**
 * Aviso de que un `<Link>` está cargando su página: va como hijo del enlace (que debe ser
 * `relative`, como `Button`) y lo cubre con un pulso suave. Aparece solo si la página tarda más de
 * 300 ms (docs/11): en las rápidas no se ve nada. Con `prefers-reduced-motion`, sin pulso. Sin
 * JavaScript no hace nada y el enlace navega como siempre. Es lo que Next recomienda para rutas
 * dinámicas sin `loading.tsx`, que en la reserva dejaría "Cargando" sin JavaScript.
 */
export function LinkPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      data-slot="link-pending"
      data-pending={pending || undefined}
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] opacity-0 transition-opacity duration-150",
        pending && "opacity-100 delay-300",
        className,
      )}
    >
      {pending ? (
        <span className="block size-full animate-pulse bg-current/15 motion-reduce:animate-none" />
      ) : null}
    </span>
  );
}
