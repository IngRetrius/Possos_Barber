"use client";

import { useActionState, useState, useTransition } from "react";
import { Button, Field, InlineError, Textarea, submitKeepingValues, toast } from "@possos/ui";
import { addNoteAction, resetNoShowsAction, type NoteFormState } from "../_actions/customers";

/** Nota privada del barbero sobre el cliente. Solo la ven él y el administrador. */
export function NoteForm({ customerId, barberId }: { customerId: string; barberId: string }) {
  const [state, action, pending] = useActionState<NoteFormState, FormData>(addNoteAction, {});
  return (
    <form
      key={state.saved ?? "nota"}
      action={action}
      onSubmit={submitKeepingValues(action)}
      className="grid gap-3"
    >
      <input type="hidden" name="cliente" value={customerId} />
      <input type="hidden" name="barbero" value={barberId} />
      <Field label="Nota nueva" hint="Privada: el cliente no la ve." error={state.error}>
        <Textarea name="nota" maxLength={500} />
      </Field>
      <Button type="submit" variant="secondary" disabled={pending} aria-busy={pending}>
        {pending ? "Guardando..." : "Guardar nota"}
      </Button>
    </form>
  );
}

/** El administrador reinicia las inasistencias y quita la marca de aprobación. */
export function ResetNoShowsButton({ customerId }: { customerId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid gap-2">
      <Button
        variant="secondary"
        disabled={pending}
        aria-busy={pending}
        onClick={() =>
          start(async () => {
            const result = await resetNoShowsAction(customerId);
            if (result.ok) toast("Reiniciaste las inasistencias");
            else setError(result.error ?? null);
          })
        }
      >
        {pending ? "Reiniciando..." : "Reiniciar inasistencias"}
      </Button>
      {error ? <InlineError>{error}</InlineError> : null}
    </div>
  );
}
