"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { BottomBar, Button, Checkbox, Field, Input, submitKeepingValues } from "@possos/ui";
import { MAX_ADDON_NAME, type AddonError, type AddonErrors } from "./addon-form";

export interface AddonFormState {
  error?: string;
  fieldErrors?: AddonErrors;
}

export type AddonAction = (state: AddonFormState, form: FormData) => Promise<AddonFormState>;

export interface AddonFormProps {
  action: AddonAction;
  serviceId: string;
  /** Al editar: el adicional actual. */
  initial?: {
    id: string;
    name: string;
    duration_min: number;
    price_cop: number | null;
    active: boolean;
  };
  submitLabel: string;
}

/**
 * Crear o editar un adicional de un servicio (administrador): nombre, minutos que suma y precio.
 * Sin precio, el total dice [PENDIENTE] (regla 8 de CLAUDE.md). Desactivarlo lo quita de la
 * reserva; las citas que ya lo tienen no cambian.
 */
export function AddonForm({ action, serviceId, initial, submitLabel }: AddonFormProps) {
  const t = useTranslations("catalog.addonForm");
  const [state, formAction, pending] = useActionState(action, {});
  const fieldErrors = state.fieldErrors ?? {};
  const error = (key: AddonError | undefined) =>
    key ? t(`errors.${key}`, { maxName: MAX_ADDON_NAME }) : undefined;
  return (
    <form
      action={formAction}
      onSubmit={submitKeepingValues(formAction)}
      className="flex flex-1 flex-col"
      noValidate
    >
      <input type="hidden" name="servicio" value={serviceId} />
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}
      <div className="grid gap-5 px-gutter pt-2 pb-8">
        <Field label={t("name")} hint={t("nameHint")} error={error(fieldErrors.name)}>
          <Input
            name="nombre"
            defaultValue={initial?.name}
            maxLength={MAX_ADDON_NAME}
            autoComplete="off"
            required
          />
        </Field>
        <Field label={t("price")} hint={t("priceHint")} error={error(fieldErrors.priceCop)}>
          <Input
            name="precio"
            inputMode="numeric"
            defaultValue={initial?.price_cop ?? ""}
            placeholder="5.000"
            className="tabular-nums"
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
            defaultValue={initial?.duration_min ?? 0}
            className="tabular-nums"
          />
        </Field>
        {initial ? (
          <Checkbox name="activo" value="si" defaultChecked={initial.active} hint={t("activeHint")}>
            {t("active")}
          </Checkbox>
        ) : null}
      </div>
      <BottomBar summary={state.error ? <span className="text-danger">{state.error}</span> : null}>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? t("saving") : submitLabel}
        </Button>
      </BottomBar>
    </form>
  );
}
