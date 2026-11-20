"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  Button,
  formatDate,
  InlineError,
  Sheet,
  SheetClose,
  SheetTrigger,
  toast,
} from "@possos/ui";
import { atTime } from "./my-appointments";

export type CancelResult = { ok: true } | { ok: false; error: string };

/** Server Action que llama a `cancel()` con la sesión del cliente. Error ya en español. */
export type CancelAppointmentAction = (appointmentId: string) => Promise<CancelResult>;

export interface CancelAppointmentProps {
  appointmentId: string;
  /** Inicio de la cita (ISO), para la pregunta de la hoja. */
  start: string;
  action: CancelAppointmentAction;
}

/** Espera máxima al `popstate` de la hoja antes de refrescar la página. */
const POPSTATE_TIMEOUT_MS = 500;

/**
 * "Cancelar" y su hoja: "¿Cancelar tu cita del jue 20 nov a las 3:00 p. m.?" con "Sí, cancelar"
 * y "No" (docs/11). La base decide si todavía se puede (`TOO_LATE_TO_CANCEL`); el error sale en
 * la hoja.
 *
 * Al cancelar, la hoja se cierra primero y la página se refresca después del `popstate` con que
 * la hoja quita su entrada del historial (o a los 500 ms): si se refrescara antes, volver atrás
 * en el historial podía pintar otra vez la página de antes, con la cita sin cancelar (F3).
 */
export function CancelAppointment({ appointmentId, start, action }: CancelAppointmentProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!done || open) return;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      window.removeEventListener("popstate", finish);
      setDone(false);
      toast("Cancelaste tu cita");
      router.refresh();
    };
    window.addEventListener("popstate", finish);
    const timer = window.setTimeout(finish, POPSTATE_TIMEOUT_MS);
    return () => {
      window.removeEventListener("popstate", finish);
      window.clearTimeout(timer);
    };
  }, [done, open, router]);

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await action(appointmentId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone(true);
      setOpen(false);
    });
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setError(null);
      }}
      title={`¿Cancelar tu cita del ${formatDate(start)} ${atTime(start)}?`}
      description="La hora queda libre para otros clientes."
      trigger={
        <SheetTrigger asChild>
          <Button variant="secondary" className="text-danger" disabled={done}>
            Cancelar
          </Button>
        </SheetTrigger>
      }
      footer={
        <>
          <Button variant="danger" onClick={confirm} disabled={pending} aria-busy={pending}>
            {pending ? "Cancelando..." : "Sí, cancelar"}
          </Button>
          <SheetClose asChild>
            <Button variant="secondary" disabled={pending}>
              No
            </Button>
          </SheetClose>
        </>
      }
    >
      {error ? <InlineError>{error}</InlineError> : null}
    </Sheet>
  );
}
