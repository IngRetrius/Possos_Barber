"use client";

import { useTranslations } from "next-intl";
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
import {
  MAX_BARBER_NAME,
  MAX_BIO,
  SLOT_INTERVALS,
  type BarberProfileError,
  type BarberProfileErrors,
} from "./profile";

export interface BarberFormState {
  error?: string;
  /** Claves de las validaciones del perfil; `services` y `percent` ya vienen traducidos. */
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
  const t = useTranslations("barbers.form");
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};
  const error = (key: BarberProfileError | undefined) =>
    key ? t(`errors.${key}`, { maxName: MAX_BARBER_NAME, maxBio: MAX_BIO }) : undefined;
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
        <Field label={t("name")} error={error(errors.displayName)}>
          <Input
            name="nombre"
            defaultValue={initial.display_name}
            maxLength={MAX_BARBER_NAME}
            autoComplete="off"
            required
          />
        </Field>
        <Field label={t("bio")} hint={t("bioHint")} error={error(errors.bio)}>
          <Textarea name="bio" defaultValue={initial.bio ?? ""} maxLength={MAX_BIO} />
        </Field>
        <Field label={t("whatsapp")} hint={t("whatsappHint")} error={error(errors.whatsappUrl)}>
          <Input
            name="whatsapp"
            inputMode="url"
            defaultValue={initial.whatsapp_url ?? ""}
            autoComplete="off"
          />
        </Field>
        <Field label={t("interval")} hint={t("intervalHint")} error={error(errors.slotIntervalMin)}>
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
          <legend className="mb-1 text-label">{t("services")}</legend>
          {services.length === 0 ? (
            <p className="text-caption text-fg-muted">{t("noServices")}</p>
          ) : (
            services.map((s) => (
              <Checkbox key={s.id} name="servicio" value={s.id} defaultChecked={s.checked}>
                {s.name}
              </Checkbox>
            ))
          )}
          {errors.services ? <p className="text-caption text-danger">{errors.services}</p> : null}
        </fieldset>
        <Checkbox name="activo" value="si" defaultChecked={initial.active} hint={t("activeHint")}>
          {t("active")}
        </Checkbox>
      </div>
      <BottomBar
        summary={
          state.error ? (
            <span className="text-danger">{state.error}</span>
          ) : state.saved ? (
            t("saved")
          ) : null
        }
      >
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? t("saving") : t("save")}
        </Button>
      </BottomBar>
    </form>
  );
}
