"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button, Checkbox, Field, InlineError, Input, submitKeepingValues } from "@possos/ui";

export interface TimeOffConflict {
  id: string;
  /** "vie 20 nov, 10:00 a. m. · Carlos R." */
  label: string;
  /** Abre la cita en el panel para moverla o cancelarla. */
  href: string;
}

export interface TimeOffFormState {
  error?: string;
  fieldErrors?: { from?: string; to?: string; time?: string };
  /** El bloqueo quedó creado; estas citas quedaron debajo. */
  conflicts?: TimeOffConflict[];
  created?: boolean;
}

export type TimeOffAction = (state: TimeOffFormState, form: FormData) => Promise<TimeOffFormState>;

export interface TimeOffFormProps {
  action: TimeOffAction;
  barberId: string;
  /** `YYYY-MM-DD` por omisión (hoy). */
  defaultDate: string;
}

/**
 * Crear un bloqueo (docs/11, "Más"): un día o varios, todo el día o unas horas, con motivo. Si
 * cae sobre citas, el bloqueo queda creado y se listan para moverlas o cancelarlas (docs/09).
 */
export function TimeOffForm({ action, barberId, defaultDate }: TimeOffFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const [allDay, setAllDay] = useState(true);
  const [from, setFrom] = useState(defaultDate);
  const [to, setTo] = useState(defaultDate);
  const errors = state.fieldErrors ?? {};

  return (
    <div className="grid gap-4">
      <form
        action={formAction}
        onSubmit={submitKeepingValues(formAction)}
        className="grid gap-4"
        noValidate
      >
        <input type="hidden" name="barbero" value={barberId} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Desde" error={errors.from} className="min-w-0">
            <Input
              type="date"
              name="desde"
              className="w-0 min-w-full px-3"
              value={from}
              required
              onChange={(e) => {
                setFrom(e.target.value);
                if (e.target.value > to) setTo(e.target.value);
              }}
            />
          </Field>
          <Field label="Hasta" error={errors.to} className="min-w-0">
            <Input
              type="date"
              name="hasta"
              className="w-0 min-w-full px-3"
              value={to}
              min={from}
              required
              onChange={(e) => setTo(e.target.value)}
            />
          </Field>
        </div>
        <Checkbox
          name="todo_el_dia"
          value="si"
          checked={allDay}
          onChange={(e) => setAllDay(e.target.checked)}
        >
          Todo el día
        </Checkbox>
        {allDay ? null : (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Hora de inicio" error={errors.time} className="min-w-0">
              <Input
                type="time"
                name="inicio"
                step={300}
                defaultValue="12:00"
                required
                className="w-0 min-w-full px-3"
              />
            </Field>
            <Field label="Hora de fin" className="min-w-0">
              <Input
                type="time"
                name="fin"
                step={300}
                defaultValue="14:00"
                required
                className="w-0 min-w-full px-3"
              />
            </Field>
          </div>
        )}
        <Field label="Motivo" hint="Opcional. Solo lo ve el personal.">
          <Input name="motivo" maxLength={80} placeholder="Almuerzo, vacaciones..." />
        </Field>
        {state.error ? <InlineError>{state.error}</InlineError> : null}
        <Button type="submit" variant="secondary" disabled={pending} aria-busy={pending}>
          {pending ? "Bloqueando..." : "Bloquear"}
        </Button>
      </form>
      {state.created ? (
        <div role="status" className="grid gap-3 rounded-card border border-border bg-surface p-4">
          {state.conflicts && state.conflicts.length > 0 ? (
            <>
              <p className="text-body">
                Bloqueaste ese horario, pero{" "}
                {state.conflicts.length === 1
                  ? "hay 1 cita debajo"
                  : `hay ${state.conflicts.length} citas debajo`}
                . Muévelas o cancélalas:
              </p>
              <ul className="grid gap-2">
                {state.conflicts.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={c.href}
                      className="flex min-h-12 items-center text-label underline underline-offset-4"
                    >
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-body">Bloqueaste ese horario. No había citas.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
