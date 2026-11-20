"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("web.admin.settings");
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
        {pending ? t("saving") : submitLabel}
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
  const t = useTranslations("web.admin.settings");
  return (
    <SettingsForm action={setRateAction} submitLabel={t("save")} savedLabel={t("rateSaved")}>
      {(errors) => (
        <>
          <input type="hidden" name="barbero" value={barberId} />
          <Field
            label={t("rateLabel", { name: barberName })}
            hint={pct ? undefined : t("rateHint")}
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
  const t = useTranslations("web.admin.settings");
  return (
    <SettingsForm
      action={saveBookingSettingsAction}
      submitLabel={t("bookingSave")}
      savedLabel={t("bookingSaved")}
    >
      {(errors) => (
        <>
          <Field label={t("minLead")} hint={t("minLeadHint")} error={errors.minLeadMin}>
            <Input name="anticipacion" inputMode="numeric" defaultValue={initial.min_lead_min} />
          </Field>
          <Field label={t("maxDays")} hint={t("maxDaysHint")} error={errors.maxDaysAhead}>
            <Input name="dias" inputMode="numeric" defaultValue={initial.max_days_ahead} />
          </Field>
          <Field
            label={t("cancelWindow")}
            hint={t("cancelWindowHint")}
            error={errors.cancelWindowMin}
          >
            <Input
              name="cancelacion"
              inputMode="numeric"
              defaultValue={initial.cancel_window_min}
            />
          </Field>
          <Field label={t("noShows")} hint={t("noShowsHint")} error={errors.noShowThreshold}>
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
  const t = useTranslations("web.admin.settings");
  return (
    <SettingsForm
      action={saveReminderSettingsAction}
      submitLabel={t("remindersSave")}
      savedLabel={t("remindersSaved")}
    >
      {(errors) => (
        <>
          <Field label={t("first")} error={errors.firstHours}>
            <Input name="primero" inputMode="decimal" defaultValue={first} />
          </Field>
          <Field label={t("second")} hint={t("secondHint")} error={errors.secondHours}>
            <Input name="segundo" inputMode="decimal" defaultValue={second} />
          </Field>
          <Checkbox name="confirmacion" value="si" defaultChecked={sendConfirmation}>
            {t("confirmation")}
          </Checkbox>
        </>
      )}
    </SettingsForm>
  );
}

export function GrantRoleForm({ profiles }: { profiles: { id: string; name: string }[] }) {
  const t = useTranslations("web.admin.settings");
  const [role, setRole] = useState<StaffRole>("barber");
  return (
    <SettingsForm action={grantRoleAction} submitLabel={t("grant")} savedLabel={t("granted")}>
      {(errors) => (
        <>
          <Field label={t("email")} hint={t("emailHint")} error={errors.correo}>
            <Input name="correo" type="email" autoComplete="off" />
          </Field>
          <fieldset className="grid gap-1">
            <legend className="mb-1 text-label">{t("role")}</legend>
            {(
              [
                ["barber", t("barber"), t("barberHint")],
                ["admin", t("admin"), t("adminHint")],
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
              label={t("profile")}
              hint={profiles.length === 0 ? t("noProfiles") : t("profileHint")}
              error={errors.perfil}
            >
              <select
                name="perfil"
                defaultValue=""
                className="h-12 w-full rounded-card border border-border-strong bg-surface px-4 text-body text-fg"
              >
                <option value="">{t("chooseProfile")}</option>
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

export function RevokeRoleButton({
  userId,
  role,
  email,
}: {
  userId: string;
  role: StaffRole;
  email: string;
}) {
  const t = useTranslations("web.admin.settings");
  const [pending, start] = useTransition();
  const roleName = t(`roles.${role}`);
  return (
    <Button
      variant="ghost"
      className="h-12 px-3"
      disabled={pending}
      aria-busy={pending}
      onClick={() =>
        start(async () => {
          const result = await revokeRoleAction(userId, role);
          if (result.ok) toast(t("revoked", { role: roleName }));
          else toast.error(result.error ?? t("revokeFailed"));
        })
      }
    >
      {role === "admin" ? t("admin") : t("barber")}
      <X aria-hidden="true" strokeWidth={1.5} />
      <span className="sr-only">{t("revokeHint", { role: roleName, email })}</span>
    </Button>
  );
}
