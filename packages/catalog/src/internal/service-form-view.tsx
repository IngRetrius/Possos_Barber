"use client";

import { useActionState } from "react";
import {
  BottomBar,
  Button,
  Checkbox,
  Field,
  Input,
  Textarea,
  submitKeepingValues,
} from "@possos/ui";
import { MAX_SERVICE_DESCRIPTION, MAX_SERVICE_NAME, type ServiceErrors } from "./service-form";

export interface ServiceFormState {
  error?: string;
  fieldErrors?: ServiceErrors;
}

export type ServiceAction = (state: ServiceFormState, form: FormData) => Promise<ServiceFormState>;

export interface ServiceFormProps {
  action: ServiceAction;
  /** Al editar: el servicio actual. */
  initial?: {
    id: string;
    name: string;
    description: string | null;
    duration_min: number;
    price_cop: number | null;
    active: boolean;
  };
  submitLabel: string;
}

/**
 * Crear o editar un servicio (administrador). Sin precio, la página pública y el resumen dicen
 * [PENDIENTE] (regla 8 de CLAUDE.md). Desactivar lo quita de la reserva sin borrar el historial.
 */
export function ServiceForm({ action, initial, submitLabel }: ServiceFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};
  return (
    <form
      action={formAction}
      onSubmit={submitKeepingValues(formAction)}
      className="flex flex-1 flex-col"
      noValidate
    >
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}
      <div className="grid gap-5 px-gutter pt-2 pb-8">
        <Field label="Nombre" error={errors.name}>
          <Input
            name="nombre"
            defaultValue={initial?.name}
            maxLength={MAX_SERVICE_NAME}
            autoComplete="off"
            required
          />
        </Field>
        <Field label="Duración en minutos" hint="En múltiplos de 5." error={errors.durationMin}>
          <Input
            name="duracion"
            inputMode="numeric"
            defaultValue={initial?.duration_min ?? 60}
            required
            className="tabular-nums"
          />
        </Field>
        <Field
          label="Precio en pesos"
          hint="Déjalo vacío si todavía no está definido: los clientes verán [PENDIENTE]."
          error={errors.priceCop}
        >
          <Input
            name="precio"
            inputMode="numeric"
            defaultValue={initial?.price_cop ?? ""}
            placeholder="30.000"
            className="tabular-nums"
          />
        </Field>
        <Field label="Descripción" hint="Opcional." error={errors.description}>
          <Textarea
            name="descripcion"
            defaultValue={initial?.description ?? ""}
            maxLength={MAX_SERVICE_DESCRIPTION}
          />
        </Field>
        {initial ? (
          <Checkbox
            name="activo"
            value="si"
            defaultChecked={initial.active}
            hint="Si lo desactivas, los clientes ya no lo pueden reservar. Las citas que existen no cambian."
          >
            Activo
          </Checkbox>
        ) : null}
      </div>
      <BottomBar summary={state.error ? <span className="text-danger">{state.error}</span> : null}>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Guardando..." : submitLabel}
        </Button>
      </BottomBar>
    </form>
  );
}
