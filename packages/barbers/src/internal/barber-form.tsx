"use client";

import { useActionState, type ReactNode } from "react";
import {
  BottomBar,
  Button,
  Checkbox,
  Field,
  Input,
  Textarea,
  submitKeepingValues,
} from "@possos/ui";
import { MAX_BARBER_NAME, MAX_BIO, SLOT_INTERVALS, type BarberProfileErrors } from "./profile";

export interface BarberFormState {
  error?: string;
  fieldErrors?: BarberProfileErrors & { services?: string; percent?: string };
  saved?: boolean;
}

export type BarberAction = (state: BarberFormState, form: FormData) => Promise<BarberFormState>;

export interface BarberFormProps {
  action: BarberAction;
  initial: {
    id: string;
    display_name: string;
    bio: string | null;
    whatsapp_url: string | null;
    slot_interval_min: number;
    active: boolean;
  };
  /** Servicios activos y los que hace este barbero. */
  services: { id: string; name: string; checked: boolean }[];
  /** Lo que va arriba del formulario (foto y portafolio, que se guardan aparte). */
  children?: ReactNode;
}

/**
 * Perfil del barbero para el administrador (docs/11, "Más"): nombre, presentación, enlace de
 * WhatsApp, intervalo de las horas, servicios que hace y si está activo.
 */
export function BarberForm({ action, initial, services, children }: BarberFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};
  return (
    <form
      action={formAction}
      onSubmit={submitKeepingValues(formAction)}
      className="flex flex-1 flex-col"
      noValidate
    >
      <input type="hidden" name="id" value={initial.id} />
      <div className="grid gap-6 px-gutter pt-2 pb-8">
        {children}
        <Field label="Nombre visible" error={errors.displayName}>
          <Input
            name="nombre"
            defaultValue={initial.display_name}
            maxLength={MAX_BARBER_NAME}
            autoComplete="off"
            required
          />
        </Field>
        <Field
          label="Presentación"
          hint="Una o dos frases para la página pública. Vacía, dice [PENDIENTE]."
          error={errors.bio}
        >
          <Textarea name="bio" defaultValue={initial.bio ?? ""} maxLength={MAX_BIO} />
        </Field>
        <Field
          label="WhatsApp"
          hint="El celular de 10 dígitos o un enlace https://wa.me/... Sale en la página pública."
          error={errors.whatsappUrl}
        >
          <Input
            name="whatsapp"
            inputMode="url"
            defaultValue={initial.whatsapp_url ?? ""}
            autoComplete="off"
          />
        </Field>
        <Field
          label="Intervalo de las horas"
          hint="Cada cuánto empieza una hora libre desde el inicio de cada rango del horario."
          error={errors.slotIntervalMin}
        >
          <select
            name="intervalo"
            defaultValue={String(initial.slot_interval_min)}
            className="h-12 w-full rounded-card border border-border-strong bg-surface px-4 text-body text-fg"
          >
            {SLOT_INTERVALS.map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        </Field>
        <fieldset className="grid gap-1">
          <legend className="mb-1 text-label">Servicios que hace</legend>
          {services.length === 0 ? (
            <p className="text-caption text-fg-muted">Todavía no hay servicios activos.</p>
          ) : (
            services.map((s) => (
              <Checkbox key={s.id} name="servicio" value={s.id} defaultChecked={s.checked}>
                {s.name}
              </Checkbox>
            ))
          )}
          {errors.services ? <p className="text-caption text-danger">{errors.services}</p> : null}
        </fieldset>
        <Checkbox
          name="activo"
          value="si"
          defaultChecked={initial.active}
          hint="Inactivo: no aparece en la página pública ni en la reserva. Su agenda y sus cobros se conservan."
        >
          Activo
        </Checkbox>
      </div>
      <BottomBar
        summary={
          state.error ? (
            <span className="text-danger">{state.error}</span>
          ) : state.saved ? (
            "Guardaste los cambios"
          ) : null
        }
      >
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Guardando..." : "Guardar"}
        </Button>
      </BottomBar>
    </form>
  );
}
