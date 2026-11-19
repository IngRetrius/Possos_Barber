"use client";

import { useActionState } from "react";
import { BottomBar, Button, Field, Input, submitKeepingValues } from "@possos/ui";
import { createBarberAction, type NewBarberState } from "../_actions/admin";

/** Barbero nuevo: nombre y porcentaje. Lo demás (foto, horario, servicios) se edita después. */
export function NewBarberForm() {
  const [state, action, pending] = useActionState<NewBarberState, FormData>(createBarberAction, {});
  const errors = state.fieldErrors ?? {};
  return (
    <form
      action={action}
      onSubmit={submitKeepingValues(action)}
      className="flex flex-1 flex-col"
      noValidate
    >
      <div className="grid gap-5 px-gutter pt-2 pb-8">
        <Field label="Nombre visible" error={errors.displayName}>
          <Input name="nombre" maxLength={60} autoComplete="off" required />
        </Field>
        <Field
          label="Porcentaje para el barbero"
          hint="Del valor de cada servicio. El resto es para la barbería."
          error={errors.percent}
        >
          <Input name="porcentaje" inputMode="decimal" defaultValue="50" className="tabular-nums" />
        </Field>
        <p className="text-caption text-fg-muted">
          Queda sin cuenta: para que entre al panel, asígnale el rol de barbero a su cuenta. Después
          de crearlo, carga su foto, su horario y sus servicios.
        </p>
      </div>
      <BottomBar summary={state.error ? <span className="text-danger">{state.error}</span> : null}>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Creando..." : "Crear barbero"}
        </Button>
      </BottomBar>
    </form>
  );
}
