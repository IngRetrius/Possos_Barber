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
  MAX_SERVICE_CATEGORY,
  MAX_SERVICE_DESCRIPTION,
  MAX_SERVICE_NAME,
  type ServiceError,
  type ServiceErrors,
} from "./service-form";

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
    category: string | null;
    active: boolean;
  };
  submitLabel: string;
  /** Lo que va al final del formulario, antes de la barra (el enlace a los adicionales). */
  extra?: ReactNode;
}

/**
 * Crear o editar un servicio (administrador). Sin precio, la página pública y el resumen dicen
 * [PENDIENTE] (regla 8 de CLAUDE.md). Desactivar lo quita de la reserva sin borrar el historial.
 */
export function ServiceForm({ action, initial, submitLabel, extra }: ServiceFormProps) {
  const t = useTranslations("catalog.serviceForm");
  const [state, formAction, pending] = useActionState(action, {});
  const fieldErrors = state.fieldErrors ?? {};
  const error = (key: ServiceError | undefined) =>
    key
      ? t(`errors.${key}`, {
          maxName: MAX_SERVICE_NAME,
          maxDescription: MAX_SERVICE_DESCRIPTION,
          maxCategory: MAX_SERVICE_CATEGORY,
        })
      : undefined;
  return (
    <form
      action={formAction}
      onSubmit={submitKeepingValues(formAction)}
      className="flex flex-1 flex-col"
      noValidate
    >
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}
      <div className="grid gap-5 px-gutter pt-2 pb-8">
        <Field label={t("name")} error={error(fieldErrors.name)}>
          <Input
            name="nombre"
            defaultValue={initial?.name}
            maxLength={MAX_SERVICE_NAME}
            autoComplete="off"
            required
          />
        </Field>
        <Field
          label={t("duration")}
          hint={t("durationHint")}
          error={error(fieldErrors.durationMin)}
        >
          <Input
            name="duracion"
            inputMode="numeric"
            defaultValue={initial?.duration_min ?? 60}
            required
            className="tabular-nums"
          />
        </Field>
        <Field label={t("price")} hint={t("priceHint")} error={error(fieldErrors.priceCop)}>
          <Input
            name="precio"
            inputMode="numeric"
            defaultValue={initial?.price_cop ?? ""}
            placeholder="30.000"
            className="tabular-nums"
          />
        </Field>
        <Field
          label={t("description")}
          hint={t("descriptionHint")}
          error={error(fieldErrors.description)}
        >
          <Textarea
            name="descripcion"
            defaultValue={initial?.description ?? ""}
            maxLength={MAX_SERVICE_DESCRIPTION}
          />
        </Field>
        <Field label={t("category")} hint={t("categoryHint")} error={error(fieldErrors.category)}>
          <Input
            name="grupo"
            defaultValue={initial?.category ?? ""}
            maxLength={MAX_SERVICE_CATEGORY}
            autoComplete="off"
          />
        </Field>
        {initial ? (
          <Checkbox name="activo" value="si" defaultChecked={initial.active} hint={t("activeHint")}>
            {t("active")}
          </Checkbox>
        ) : null}
        {extra}
      </div>
      <BottomBar summary={state.error ? <span className="text-danger">{state.error}</span> : null}>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? t("saving") : submitLabel}
        </Button>
      </BottomBar>
    </form>
  );
}
