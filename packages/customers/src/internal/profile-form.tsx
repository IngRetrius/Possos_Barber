"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState, useId, useState, type FormEvent, type ReactNode } from "react";
import { BottomBar, Button, Checkbox, Field, InlineError, Input, PhoneInput } from "@possos/ui";
import type { ProfileFormState } from "../index";
import { normalizePhoneDigits, parseColombianMobile, PHONE_ERROR_KEY } from "./phone";
import {
  MAX_NAME_LENGTH,
  validateProfile,
  type ProfileError,
  type ProfileErrors,
  type ProfileField,
} from "./profile";

export type ProfileAction = (
  state: ProfileFormState,
  formData: FormData,
) => Promise<ProfileFormState>;

export interface ProfileFormProps {
  /** Guarda el perfil. Al completar, redirige; al editar, devuelve `saved`. */
  action: ProfileAction;
  /** Título e introducción de la pantalla. */
  heading: ReactNode;
  /** Pide la casilla de tratamiento de datos (perfil nuevo o política nueva). */
  requireConsent: boolean;
  initial: { fullName: string; phoneNational: string; whatsappOptIn: boolean };
  /** Enlace a la política de tratamiento de datos. */
  policyHref: string;
  /** A dónde volver al terminar (se envía como campo oculto). */
  next?: string | null;
  submitLabel: string;
  /** Lo que va entre el formulario y la barra inferior (sesión, borrar la cuenta). */
  children?: ReactNode;
}

const FIELD_ORDER: ProfileField[] = ["fullName", "phone", "dataConsent"];

const linkClass = "text-fg underline underline-offset-4 hover:text-fg-muted";

/**
 * Perfil del cliente: nombre, celular y las dos autorizaciones, separadas y sin marcar
 * (Ley 1581, docs/11). La de datos es obligatoria; la de WhatsApp, opcional.
 * El celular se revisa al salir del campo y antes de enviar.
 */
export function ProfileForm({
  action,
  heading,
  requireConsent,
  initial,
  policyHref,
  next,
  submitLabel,
  children,
}: ProfileFormProps) {
  const t = useTranslations("customers.profile");
  const formId = useId();
  const [state, formAction, isPending] = useActionState(action, {});
  const [fullName, setFullName] = useState(initial.fullName);
  const [phone, setPhone] = useState(initial.phoneNational);
  const [dataConsent, setDataConsent] = useState(false);
  const [whatsappOptIn, setWhatsappOptIn] = useState(initial.whatsappOptIn);
  const [clientErrors, setClientErrors] = useState<ProfileErrors>({});
  // El aviso de "guardado" se esconde en cuanto la persona vuelve a cambiar algo.
  const [editedAfter, setEditedAfter] = useState<ProfileFormState | null>(null);

  const errors: ProfileErrors = { ...state.fieldErrors, ...clientErrors };
  const error = (key: ProfileError | undefined) => (key ? t(`errors.${key}`) : undefined);
  const clearError = (field: ProfileField) => {
    setClientErrors(({ [field]: _removed, ...rest }) => rest);
    setEditedAfter(state);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    const result = validateProfile(
      { fullName, phone, whatsappOptIn, dataConsent },
      { requireConsent },
    );
    if (result.ok) {
      setClientErrors({});
      return;
    }
    event.preventDefault();
    setClientErrors(result.errors);
    const first = FIELD_ORDER.find((field) => result.errors[field]);
    if (first) (event.currentTarget.elements.namedItem(first) as HTMLElement | null)?.focus();
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="grid gap-6 px-gutter pt-2 pb-8">
        {heading}
        <form id={formId} action={formAction} onSubmit={onSubmit} noValidate className="grid gap-5">
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <Field label={t("name")} error={error(errors.fullName)}>
            <Input
              name="fullName"
              autoComplete="name"
              autoCapitalize="words"
              maxLength={MAX_NAME_LENGTH}
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                clearError("fullName");
              }}
              required
            />
          </Field>
          <Field label={t("phone")} hint={t("phoneHint")} error={error(errors.phone)}>
            <PhoneInput
              name="phone"
              // Más de 10 para que quepa un número pegado con +57 y espacios; se limpia al escribir.
              maxLength={20}
              value={phone}
              onChange={(e) => {
                setPhone(normalizePhoneDigits(e.target.value));
                clearError("phone");
              }}
              onBlur={() => {
                if (!phone) return;
                const parsed = parseColombianMobile(phone);
                if (!parsed.ok) {
                  setClientErrors((prev) => ({ ...prev, phone: PHONE_ERROR_KEY[parsed.error] }));
                }
              }}
              required
            />
          </Field>
          <div className="grid gap-1">
            {requireConsent ? (
              <Checkbox
                name="dataConsent"
                checked={dataConsent}
                onChange={(e) => {
                  setDataConsent(e.target.checked);
                  clearError("dataConsent");
                }}
                error={error(errors.dataConsent)}
                hint={
                  <Link href={policyHref} target="_blank" className={linkClass}>
                    {t("readPolicy")}
                  </Link>
                }
              >
                {t("consent")}
              </Checkbox>
            ) : null}
            <Checkbox
              name="whatsappOptIn"
              checked={whatsappOptIn}
              onChange={(e) => {
                setWhatsappOptIn(e.target.checked);
                setEditedAfter(state);
              }}
              hint={t("whatsappHint")}
            >
              {t("whatsapp")}
            </Checkbox>
          </div>
        </form>
        {state.error ? <InlineError>{state.error}</InlineError> : null}
        {state.saved && editedAfter !== state ? (
          <p role="status" className="text-body text-fg-muted">
            {t("saved")}
          </p>
        ) : null}
        {children}
      </div>
      <BottomBar>
        <Button type="submit" form={formId} disabled={isPending}>
          {isPending ? t("saving") : submitLabel}
        </Button>
      </BottomBar>
    </div>
  );
}
