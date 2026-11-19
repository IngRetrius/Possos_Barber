"use client";

import { useActionState, type ReactNode } from "react";
import { BottomBar, Button } from "@possos/ui";

export interface BookFormState {
  /** Error ya en español (`bookingErrorMessage`). */
  error?: string;
}

export type BookAction = (state: BookFormState, form: FormData) => Promise<BookFormState>;

export interface BookFormProps {
  /** Server Action que llama a `book()`. Al reservar, redirige a "Listo". */
  action: BookAction;
  serviceId: string;
  /** Id del barbero o `ANY_BARBER`. */
  barberId: string;
  /** `YYYY-MM-DD`, para volver al mismo día si la hora se ocupó. */
  date: string;
  startAt: string;
  /** Línea arriba del botón cuando no hay error. */
  summary?: ReactNode;
}

/** Barra inferior de "Confirmar" con el botón "Reservar". */
export function BookForm({ action, serviceId, barberId, date, startAt, summary }: BookFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <BottomBar summary={state.error ? <span className="text-danger">{state.error}</span> : summary}>
      <form action={formAction} className="grid">
        <input type="hidden" name="servicio" value={serviceId} />
        <input type="hidden" name="barbero" value={barberId} />
        <input type="hidden" name="fecha" value={date} />
        <input type="hidden" name="hora" value={startAt} />
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Reservando..." : "Reservar"}
        </Button>
      </form>
    </BottomBar>
  );
}
