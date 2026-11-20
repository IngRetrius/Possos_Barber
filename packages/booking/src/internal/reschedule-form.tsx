"use client";

import { useTranslations } from "next-intl";
import { useActionState, type ReactNode } from "react";
import { BottomBar, Button } from "@possos/ui";

export interface RescheduleFormState {
  /** Error ya en el idioma de la persona (`bookingErrorMessage`). */
  error?: string;
}

export type RescheduleAction = (
  state: RescheduleFormState,
  form: FormData,
) => Promise<RescheduleFormState>;

export interface RescheduleFormProps {
  /** Server Action que llama a `reschedule()`. Al cambiar, redirige a la cita nueva. */
  action: RescheduleAction;
  appointmentId: string;
  /** `YYYY-MM-DD`, para volver al mismo día si la hora se ocupó. */
  date: string;
  startAt: string;
  /** Línea arriba del botón cuando no hay error. */
  summary?: ReactNode;
}

/** Barra inferior de "Cambiar hora · Confirmar" con el botón "Cambiar la hora". */
export function RescheduleForm({
  action,
  appointmentId,
  date,
  startAt,
  summary,
}: RescheduleFormProps) {
  const t = useTranslations("booking.reschedule");
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <BottomBar summary={state.error ? <span className="text-danger">{state.error}</span> : summary}>
      <form action={formAction} className="grid">
        <input type="hidden" name="cita" value={appointmentId} />
        <input type="hidden" name="fecha" value={date} />
        <input type="hidden" name="hora" value={startAt} />
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? t("pending") : t("submit")}
        </Button>
      </form>
    </BottomBar>
  );
}
