"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button, InlineError, Sheet, SheetClose, SheetTrigger } from "@possos/ui";
import type { AuthAction, RedirectAction } from "./forms";

function SignOutSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending ? "Cerrando sesión..." : "Cerrar sesión"}
    </Button>
  );
}

/** "Cerrar sesión". La acción cierra la sesión y redirige. */
export function SignOutButton({ action }: { action: RedirectAction }) {
  return (
    <form action={action} className="grid">
      <SignOutSubmit />
    </form>
  );
}

export interface DeleteAccountProps {
  /** Borra la cuenta y redirige; si falla, devuelve el error. */
  action: AuthAction;
  /** Si hay algo que impide borrarla (una cita próxima), el motivo. Oculta el botón. */
  blockedReason?: ReactNode;
}

/**
 * Borrar la cuenta (Ley 1581). Pide confirmación en una hoja inferior con "Sí, borrar mi
 * cuenta" en rojo y "No". La hoja se cierra antes de enviar, para que su entrada en el
 * historial no deshaga la redirección (ver Sheet en @possos/ui).
 */
export function DeleteAccount({ action, blockedReason }: DeleteAccountProps) {
  const [state, formAction, isPending] = useActionState(action, {});
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Al cerrarse, la hoja quita su entrada del historial con history.back(). Si la acción sale
  // antes de ese popstate, el router de Next la descarta junto con su redirección; por eso se
  // envía después del popstate (o a los 500 ms, si la hoja no había agregado la entrada).
  useEffect(() => {
    if (!confirmed || open) return;
    let sent = false;
    const submit = () => {
      if (sent) return;
      sent = true;
      window.removeEventListener("popstate", submit);
      formRef.current?.requestSubmit();
      setConfirmed(false);
    };
    window.addEventListener("popstate", submit);
    const timer = window.setTimeout(submit, 500);
    return () => {
      window.removeEventListener("popstate", submit);
      window.clearTimeout(timer);
    };
  }, [confirmed, open]);

  return (
    <section aria-labelledby="borrar-cuenta" className="grid gap-3">
      <h2 id="borrar-cuenta" className="text-heading">
        Borrar tu cuenta
      </h2>
      <p className="text-body text-fg-muted">
        Se borran tu nombre, tu celular, tu correo y tus autorizaciones. Las citas pasadas quedan en
        la agenda del barbero sin tus datos. No se puede deshacer.
      </p>
      {blockedReason ? (
        <p className="text-body">{blockedReason}</p>
      ) : (
        <Sheet
          open={open}
          onOpenChange={setOpen}
          title="¿Borrar tu cuenta?"
          description="Se borran tus datos y no vas a poder ingresar con este correo hasta crear una cuenta nueva."
          trigger={
            <SheetTrigger asChild>
              <Button variant="secondary" disabled={isPending}>
                {isPending ? "Borrando tu cuenta..." : "Borrar mi cuenta"}
              </Button>
            </SheetTrigger>
          }
          footer={
            <>
              <Button
                variant="danger"
                onClick={() => {
                  setConfirmed(true);
                  setOpen(false);
                }}
              >
                Sí, borrar mi cuenta
              </Button>
              <SheetClose asChild>
                <Button variant="secondary">No</Button>
              </SheetClose>
            </>
          }
        />
      )}
      <form ref={formRef} action={formAction} hidden />
      {state.error ? <InlineError>{state.error}</InlineError> : null}
    </section>
  );
}
