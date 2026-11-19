"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Drawer } from "vaul";
import { cn } from "../cn";
import { Button } from "./button";

const HISTORY_KEY = "possosSheet";

/**
 * Cierra la hoja con el gesto o el botón atrás del sistema (NN/g, docs/11): al abrir agrega una
 * entrada al historial con la misma URL, y al volver atrás se cierra. Si la hoja se cierra de
 * otra forma, se quita esa entrada.
 *
 * Si una acción de la hoja navega a otra página, ciérrala primero y navega en el siguiente
 * render; si no, la vuelta atrás que limpia el historial puede deshacer la navegación.
 */
function useCloseOnBack(open: boolean, setOpen: (open: boolean) => void, enabled: boolean) {
  const id = useId();
  const closedByBack = useRef(false);

  useEffect(() => {
    if (!enabled || !open) return;
    const ours = () => window.history.state?.[HISTORY_KEY] === id;
    if (!ours()) {
      window.history.pushState({ ...window.history.state, [HISTORY_KEY]: id }, "");
    }
    const onPop = () => {
      if (!ours()) {
        closedByBack.current = true;
        setOpen(false);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (closedByBack.current) {
        closedByBack.current = false;
      } else if (ours()) {
        window.history.back();
      }
    };
  }, [enabled, open, id, setOpen]);
}

export interface SheetProps {
  /** Controlado. Si no se pasa, la hoja maneja su propio estado. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** El botón que abre la hoja, envuelto en `<SheetTrigger>`. */
  trigger?: ReactNode;
  /** Título visible y nombre del diálogo para el lector de pantalla. */
  title: string;
  description?: ReactNode;
  /** Acciones al pie (por ejemplo, "Sí, cancelar" y "No"). */
  footer?: ReactNode;
  children?: ReactNode;
  /** Cerrar con el gesto atrás. Activado por omisión. */
  closeOnBack?: boolean;
  className?: string;
}

/**
 * Hoja inferior para tareas cortas (detalle de una cita, confirmar una cancelación). Nunca para
 * el flujo de reserva. Tiene botón "Cerrar" visible, cierra con Escape, con el gesto atrás y
 * arrastrando hacia abajo. No se apilan hojas.
 */
export function Sheet({
  open: openProp,
  onOpenChange,
  trigger,
  title,
  description,
  footer,
  children,
  closeOnBack = true,
  className,
}: SheetProps) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = useCallback(
    (next: boolean) => {
      if (openProp === undefined) setOpenState(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange],
  );
  useCloseOnBack(open, setOpen, closeOnBack);

  return (
    // vaul no mueve el foco por omisión; sin esto el teclado y VoiceOver se quedan detrás de la hoja.
    <Drawer.Root open={open} onOpenChange={setOpen} autoFocus>
      {trigger}
      <Drawer.Portal>
        <Drawer.Overlay data-slot="sheet-overlay" className="fixed inset-0 z-40 bg-bg/80" />
        <Drawer.Content
          data-slot="sheet-content"
          // Sin descripción, Radix pide decir explícitamente que no hay.
          {...(description ? {} : { "aria-describedby": undefined })}
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col rounded-t-sheet border-t border-border bg-surface-2 outline-none",
            className,
          )}
        >
          <div
            aria-hidden="true"
            className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-pill bg-border-strong"
          />
          <div className="flex items-start gap-2 pt-2 pr-2 pl-gutter">
            <div className="grid flex-1 gap-1 pt-3">
              <Drawer.Title className="text-heading">{title}</Drawer.Title>
              {description ? (
                <Drawer.Description className="text-body text-fg-muted">
                  {description}
                </Drawer.Description>
              ) : null}
            </div>
            <Drawer.Close asChild>
              <Button variant="ghost" className="px-3">
                Cerrar
              </Button>
            </Drawer.Close>
          </div>
          <div className="overflow-y-auto px-gutter pt-4 pb-safe-4">
            {children}
            {footer ? <div className="mt-6 grid gap-2">{footer}</div> : null}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

/** Envuelve el botón que abre la hoja. */
export const SheetTrigger = Drawer.Trigger;
/** Envuelve un botón del pie que, además de su acción, cierra la hoja. */
export const SheetClose = Drawer.Close;
