"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { BottomBar, Button, Field, Input, submitKeepingValues } from "@possos/ui";
import { createBarberAction, type NewBarberState } from "../_actions/admin";

/** Barbero nuevo: nombre y porcentaje. Lo demás (foto, horario, servicios) se edita después. */
export function NewBarberForm() {
  const [state, action, pending] = useActionState<NewBarberState, FormData>(createBarberAction, {});
  const t = useTranslations("web.panel.newBarber");
  const errors = state.fieldErrors ?? {};
  return (
    <form
      action={action}
      onSubmit={submitKeepingValues(action)}
      className="flex flex-1 flex-col"
      noValidate
    >
      <div className="grid gap-5 px-gutter pt-2 pb-8">
        <Field label={t("name")} error={errors.displayName}>
          <Input name="nombre" maxLength={60} autoComplete="off" required />
        </Field>
        <Field label={t("percent")} hint={t("percentHint")} error={errors.percent}>
          <Input name="porcentaje" inputMode="decimal" defaultValue="50" className="tabular-nums" />
        </Field>
        <p className="text-caption text-fg-muted">{t("note")}</p>
      </div>
      <BottomBar summary={state.error ? <span className="text-danger">{state.error}</span> : null}>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? t("pending") : t("submit")}
        </Button>
      </BottomBar>
    </form>
  );
}
