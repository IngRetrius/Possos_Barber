"use client";

import { X } from "lucide-react";
import { useActionState, useState, useTransition, type ReactNode } from "react";
import type { StaffRole } from "@possos/auth";
import {
  Button,
  Checkbox,
  Field,
  InlineError,
  Input,
  submitKeepingValues,
  toast,
} from "@possos/ui";
import {
  grantRoleAction,
  revokeRoleAction,
  saveBookingSettingsAction,
  saveReminderSettingsAction,
  setRateAction,
  type SettingsFormState,
} from "../_actions/settings";

type Action = (state: SettingsFormState, form: FormData) => Promise<SettingsFormState>;

/** Formulario corto con su botón y el aviso de guardado. */
function SettingsForm({
  action,
  submitLabel,
  savedLabel,
  children,
}: {
  action: Action;
  submitLabel: string;
  savedLabel: string;
  children: (errors: Record<string, string>) => ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      action={formAction}
      onSubmit={submitKeepingValues(formAction)}
      noValidate
      className="grid gap-4"
    >
      {children(state.fieldErrors ?? {})}
      {state.error ? <InlineError>{state.error}</InlineError> : null}
      <Button type="submit" variant="secondary" disabled={pending} aria-busy={pending}>
        {pending ? "Guardando..." : submitLabel}
      </Button>
      <p role="status" className="text-caption text-fg-muted empty:hidden">
        {state.saved && !pending ? savedLabel : ""}
      </p>
    </form>
  );
}

export function RateForm({
  barberId,
  barberName,
  pct,
}: {
  barberId: string;
  barberName: string;
  pct: string;
}) {
  return (
    <SettingsForm action={setRateAction} submitLabel="Guardar" savedLabel="Guardaste el porcentaje">
      {(errors) => (
        <>
          <input type="hidden" name="barbero" value={barberId} />
          <Field
            label={`Porcentaje de ${barberName}`}
            hint={pct ? undefined : "Sin porcentaje no se pueden registrar sus cobros."}
            error={errors.porcentaje}
          >
            <Input
              name="porcentaje"
              inputMode="decimal"
              defaultValue={pct}
              placeholder="50"
              className="tabular-nums"
            />
          </Field>
        </>
      )}
    </SettingsForm>
  );
}

export function BookingSettingsForm({
  initial,
}: {
  initial: {
    min_lead_min: number;
    max_days_ahead: number;
    cancel_window_min: number;
    no_show_threshold: number;
  };
}) {
  return (
    <SettingsForm
      action={saveBookingSettingsAction}
      submitLabel="Guardar la agenda"
      savedLabel="Guardaste las reglas de la agenda"
    >
      {(errors) => (
        <>
          <Field
            label="Anticipación mínima, en minutos"
            hint="Cuánto antes debe reservar el cliente. El personal no tiene esta regla."
            error={errors.minLeadMin}
          >
            <Input name="anticipacion" inputMode="numeric" defaultValue={initial.min_lead_min} />
          </Field>
          <Field
            label="Días hacia adelante"
            hint="Hasta cuántos días después de hoy puede reservar el cliente."
            error={errors.maxDaysAhead}
          >
            <Input name="dias" inputMode="numeric" defaultValue={initial.max_days_ahead} />
          </Field>
          <Field
            label="Cancelar o cambiar hasta, en minutos antes"
            hint="Después de eso, el cliente tiene que escribirle al barbero."
            error={errors.cancelWindowMin}
          >
            <Input
              name="cancelacion"
              inputMode="numeric"
              defaultValue={initial.cancel_window_min}
            />
          </Field>
          <Field
            label="Inasistencias para pedir aprobación"
            hint="Desde ese número, las reservas del cliente esperan a que el barbero las apruebe."
            error={errors.noShowThreshold}
          >
            <Input
              name="inasistencias"
              inputMode="numeric"
              defaultValue={initial.no_show_threshold}
            />
          </Field>
        </>
      )}
    </SettingsForm>
  );
}

export function ReminderSettingsForm({
  first,
  second,
  sendConfirmation,
}: {
  first: string;
  second: string;
  sendConfirmation: boolean;
}) {
  return (
    <SettingsForm
      action={saveReminderSettingsAction}
      submitLabel="Guardar los recordatorios"
      savedLabel="Guardaste los recordatorios"
    >
      {(errors) => (
        <>
          <Field label="Primer recordatorio, horas antes" error={errors.firstHours}>
            <Input name="primero" inputMode="decimal" defaultValue={first} />
          </Field>
          <Field
            label="Segundo recordatorio, horas antes"
            hint="Vacío para mandar solo uno."
            error={errors.secondHours}
          >
            <Input name="segundo" inputMode="decimal" defaultValue={second} />
          </Field>
          <Checkbox name="confirmacion" value="si" defaultChecked={sendConfirmation}>
            Mandar la confirmación apenas se reserva
          </Checkbox>
        </>
      )}
    </SettingsForm>
  );
}

export function GrantRoleForm({ profiles }: { profiles: { id: string; name: string }[] }) {
  const [role, setRole] = useState<StaffRole>("barber");
  return (
    <SettingsForm action={grantRoleAction} submitLabel="Dar el rol" savedLabel="Diste el rol">
      {(errors) => (
        <>
          <Field
            label="Correo de la cuenta"
            hint="La persona primero se registra en la app con ese correo."
            error={errors.correo}
          >
            <Input name="correo" type="email" autoComplete="off" />
          </Field>
          <fieldset className="grid gap-1">
            <legend className="mb-1 text-label">Rol</legend>
            {(
              [
                ["barber", "Barbero", "Ve su agenda, sus clientes y su liquidación."],
                [
                  "admin",
                  "Administrador",
                  "Ve y cambia todo, incluidos los datos de todos los clientes.",
                ],
              ] as const
            ).map(([value, label, hint]) => (
              <label key={value} className="flex min-h-12 cursor-pointer items-start gap-3 py-2">
                <input
                  type="radio"
                  name="rol"
                  value={value}
                  checked={role === value}
                  onChange={() => setRole(value)}
                  className="mt-1 size-5 shrink-0 accent-fg"
                />
                <span className="grid">
                  <span className="text-label">{label}</span>
                  <span className="text-caption text-fg-muted">{hint}</span>
                </span>
              </label>
            ))}
            {errors.rol ? <p className="text-caption text-danger">{errors.rol}</p> : null}
          </fieldset>
          {role === "barber" ? (
            <Field
              label="Perfil de barbero"
              hint={
                profiles.length === 0
                  ? "No hay perfiles sin cuenta. Créalo primero en Barberos."
                  : "Su agenda, su foto y su porcentaje."
              }
              error={errors.perfil}
            >
              <select
                name="perfil"
                defaultValue=""
                className="h-12 w-full rounded-card border border-border-strong bg-surface px-4 text-body text-fg"
              >
                <option value="">Elige un perfil</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
        </>
      )}
    </SettingsForm>
  );
}

const ROLE_LABEL: Record<StaffRole, string> = { admin: "Administrador", barber: "Barbero" };

export function RevokeRoleButton({
  userId,
  role,
  email,
}: {
  userId: string;
  role: StaffRole;
  email: string;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      className="h-12 px-3"
      disabled={pending}
      aria-busy={pending}
      onClick={() =>
        start(async () => {
          const result = await revokeRoleAction(userId, role);
          if (result.ok) toast(`Quitaste el rol de ${ROLE_LABEL[role].toLowerCase()}`);
          else toast.error(result.error ?? "No pudimos quitar el rol");
        })
      }
    >
      {ROLE_LABEL[role]}
      <X aria-hidden="true" strokeWidth={1.5} />
      <span className="sr-only">
        : quitar el rol de {ROLE_LABEL[role].toLowerCase()} a {email}
      </span>
    </Button>
  );
}
