"use client";

import { useActionState } from "react";
import { BottomBar, Button, submitKeepingValues } from "@possos/ui";
import { rescheduleAction, type RescheduleFormState } from "../_actions/agenda";
import { TimeFields } from "./time-fields";

/** "Mover": otra fecha y hora para la misma cita. */
export function RescheduleForm({
  appointmentId,
  date,
  freeStarts,
}: {
  appointmentId: string;
  date: string;
  freeStarts: string[];
}) {
  const [state, action, pending] = useActionState<RescheduleFormState, FormData>(
    rescheduleAction,
    {},
  );
  return (
    <form
      action={action}
      onSubmit={submitKeepingValues(action)}
      className="flex flex-1 flex-col"
      noValidate
    >
      <input type="hidden" name="cita" value={appointmentId} />
      <div className="grid gap-8 px-gutter pt-2 pb-8">
        <TimeFields date={date} time="" freeStarts={freeStarts} error={state.fieldErrors?.time} />
      </div>
      <BottomBar summary={state.error ? <span className="text-danger">{state.error}</span> : null}>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Moviendo..." : "Mover la cita"}
        </Button>
      </BottomBar>
    </form>
  );
}
