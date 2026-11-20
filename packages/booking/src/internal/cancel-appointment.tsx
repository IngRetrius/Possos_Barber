"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { Button, InlineError, Sheet, SheetClose, SheetTrigger, toast, useFormat } from "@possos/ui";
import { atTime } from "./my-appointments";

export type CancelResult = { ok: true } | { ok: false; error: string };

/** Server Action que llama a `cancel()` con la sesión del cliente. Error ya en su idioma. */
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
  const t = useTranslations("booking");
  const f = useFormat();
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
      toast(t("cancel.done"));
      router.refresh();
    };
    window.addEventListener("popstate", finish);
    const timer = window.setTimeout(finish, POPSTATE_TIMEOUT_MS);
    return () => {
      window.removeEventListener("popstate", finish);
      window.clearTimeout(timer);
    };
  }, [done, open, router, t]);

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      let result: Awaited<ReturnType<CancelAppointmentAction>>;
      try {
        result = await action(appointmentId);
      } catch {
        // La acción no llegó al servidor (sin conexión, F8): la cita sigue igual.
        setError(navigator.onLine ? t("errors.UNKNOWN") : t("cancel.offline"));
        return;
      }
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
      title={t("cancel.title", { date: f.date(start), at: atTime(start, f.locale) })}
      description={t("cancel.description")}
      trigger={
        <SheetTrigger asChild>
          <Button variant="secondary" className="text-danger" disabled={done}>
            {t("cancel.cancel")}
          </Button>
        </SheetTrigger>
      }
      footer={
        <>
          <Button variant="danger" onClick={confirm} disabled={pending} aria-busy={pending}>
            {pending ? t("cancel.pending") : t("cancel.confirm")}
          </Button>
          <SheetClose asChild>
            <Button variant="secondary" disabled={pending}>
              {t("cancel.no")}
            </Button>
          </SheetClose>
        </>
      }
    >
      {error ? <InlineError>{error}</InlineError> : null}
    </Sheet>
  );
}
