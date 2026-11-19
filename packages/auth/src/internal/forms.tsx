"use client";

import Link from "next/link";
import {
  startTransition,
  useActionState,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";
import { BottomBar, Button, Field, InlineError, Input } from "@possos/ui";
import type { AuthFormState } from "../index";
import { MIN_PASSWORD_LENGTH } from "./errors";
import { validateCredentials, validatePassword } from "./validate";

/*
 * Formularios de ingreso. Las acciones son Server Actions que pasa la app (apps/web), que es
 * donde se decide a dónde ir después. Cada formulario funciona sin JavaScript; con JavaScript,
 * el correo y la contraseña se revisan antes de enviar.
 *
 * Google va en su propio <form> antes del de correo: si estuviera dentro, Enter en un campo
 * dispararía "Continuar con Google", que es el primer botón del formulario.
 */

export type AuthAction = (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
export type RedirectAction = (formData: FormData) => Promise<void>;

const linkClass =
  "inline-flex min-h-12 items-center text-label text-fg underline underline-offset-4 hover:text-fg-muted";

function NextInput({ next }: { next: string | null }) {
  return next ? <input type="hidden" name="next" value={next} /> : null;
}

function Title({ children, intro }: { children: string; intro?: ReactNode }) {
  return (
    <div className="grid gap-2">
      <h1 className="text-title">{children}</h1>
      {intro ? <p className="text-body text-fg-muted">{intro}</p> : null}
    </div>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="rounded-card border border-border bg-surface px-4 py-3 text-body">
      {children}
    </p>
  );
}

function GoogleSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending ? "Abriendo Google..." : "Continuar con Google"}
    </Button>
  );
}

/** "Continuar con Google". Formulario propio; la acción redirige a Google. */
export function GoogleSignIn({ action, next }: { action: RedirectAction; next: string | null }) {
  return (
    <form action={action} className="grid">
      <NextInput next={next} />
      <GoogleSubmit />
    </form>
  );
}

function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-caption text-fg-muted" aria-hidden="true">
      <span className="h-px flex-1 bg-border" />o con tu correo
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

/** Revisión en el navegador. Devuelve false (y enfoca el primer campo con error) si no pasa. */
function useClientValidation(checkLength: boolean, withPassword: boolean) {
  const [errors, setErrors] = useState<AuthFormState["fieldErrors"]>();
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    const data = new FormData(form);
    const found = validateCredentials(
      {
        email: String(data.get("email") ?? ""),
        password: withPassword ? String(data.get("password") ?? "") : undefined,
      },
      { checkLength },
    );
    setErrors(found);
    if (found) {
      event.preventDefault();
      const first = found.email ? "email" : "password";
      (form.elements.namedItem(first) as HTMLInputElement | null)?.focus();
    }
  };
  return { clientErrors: errors, onSubmit, clear: () => setErrors(undefined) };
}

// ---------------------------------------------------------------------------------------------
// Ingresar
// ---------------------------------------------------------------------------------------------

export interface SignInFormProps {
  /** Ingreso con correo. Con `intent=resend` en el FormData, reenvía el correo de activación. */
  action: AuthAction;
  /** Sin acción de Google (proveedor apagado), solo se muestra el correo. */
  googleAction?: RedirectAction;
  next: string | null;
  signUpHref: string;
  resetHref: string;
  /** Aviso arriba del formulario ("Tu cuenta quedó activada", "Borramos tu cuenta"...). */
  notice?: ReactNode;
  /** Error que llega por la URL (por ejemplo, del callback de Google). */
  initialError?: string;
}

export function SignInForm({
  action,
  googleAction,
  next,
  signUpHref,
  resetHref,
  notice,
  initialError,
}: SignInFormProps) {
  const formId = useId();
  const [state, formAction, isPending] = useActionState(action, { error: initialError });
  const { clientErrors, onSubmit } = useClientValidation(false, true);
  const fieldErrors = clientErrors ?? state.fieldErrors;
  const emailRef = useRef<HTMLInputElement>(null);

  const resend = () => {
    const data = new FormData();
    data.set("intent", "resend");
    data.set("email", emailRef.current?.value ?? state.email ?? "");
    if (next) data.set("next", next);
    startTransition(() => formAction(data));
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="grid gap-6 px-gutter pt-2 pb-8">
        <Title intro="Para reservar y ver tus citas.">Ingresa</Title>
        {notice ? <Notice>{notice}</Notice> : null}
        {state.sent ? (
          <Notice>Te enviamos otra vez el enlace de activación. Revisa tu correo.</Notice>
        ) : null}
        {googleAction ? (
          <>
            <GoogleSignIn action={googleAction} next={next} />
            <OrDivider />
          </>
        ) : null}
        <form id={formId} action={formAction} onSubmit={onSubmit} noValidate className="grid gap-4">
          <NextInput next={next} />
          <input type="hidden" name="intent" value="signin" />
          <Field label="Correo" error={fieldErrors?.email}>
            <Input
              ref={emailRef}
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              defaultValue={state.email}
              required
            />
          </Field>
          <Field label="Contraseña" error={fieldErrors?.password}>
            <Input name="password" type="password" autoComplete="current-password" required />
          </Field>
        </form>
        {state.error ? (
          <InlineError
            action={
              state.unconfirmed ? (
                <Button variant="secondary" onClick={resend} disabled={isPending}>
                  Reenviar el enlace
                </Button>
              ) : undefined
            }
          >
            {state.error}
          </InlineError>
        ) : null}
        <div className="grid">
          <Link href={resetHref} className={linkClass}>
            Olvidé mi contraseña
          </Link>
          <p className="text-body text-fg-muted">
            ¿No tienes cuenta?{" "}
            <Link href={signUpHref} className={linkClass}>
              Crea una
            </Link>
          </p>
        </div>
      </div>
      <BottomBar>
        <Button type="submit" form={formId} disabled={isPending}>
          {isPending ? "Ingresando..." : "Ingresar"}
        </Button>
      </BottomBar>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Crear cuenta
// ---------------------------------------------------------------------------------------------

export interface SignUpFormProps {
  /** Registro. Con `intent=resend`, reenvía el correo de activación. */
  action: AuthAction;
  googleAction?: RedirectAction;
  next: string | null;
  signInHref: string;
}

export function SignUpForm({ action, googleAction, next, signInHref }: SignUpFormProps) {
  const formId = useId();
  const [state, formAction, isPending] = useActionState(action, {});
  const { clientErrors, onSubmit } = useClientValidation(true, true);
  const fieldErrors = clientErrors ?? state.fieldErrors;
  // "Usar otro correo" esconde la confirmación de este envío; un envío nuevo la vuelve a mostrar.
  const [dismissed, setDismissed] = useState<AuthFormState | null>(null);

  if (state.sent && dismissed !== state) {
    return (
      <div className="grid gap-6 px-gutter pt-2 pb-8">
        <Title>Revisa tu correo</Title>
        <p className="text-body">
          Te enviamos un enlace a <span className="font-medium">{state.email}</span>. Ábrelo para
          activar tu cuenta y seguir donde ibas.
        </p>
        <p className="text-body text-fg-muted">
          Si no llega en unos minutos, revisa la carpeta de spam o pide otro enlace.
        </p>
        {state.error ? <InlineError>{state.error}</InlineError> : null}
        <form action={formAction} className="grid gap-2">
          <NextInput next={next} />
          <input type="hidden" name="intent" value="resend" />
          <input type="hidden" name="email" value={state.email ?? ""} />
          <Button type="submit" variant="secondary" disabled={isPending}>
            {isPending ? "Enviando..." : "Reenviar el enlace"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setDismissed(state)}>
            Usar otro correo
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="grid gap-6 px-gutter pt-2 pb-8">
        <Title intro="Con tu cuenta reservas, cambias y cancelas tus citas.">Crea tu cuenta</Title>
        {googleAction ? (
          <>
            <GoogleSignIn action={googleAction} next={next} />
            <OrDivider />
          </>
        ) : null}
        <form id={formId} action={formAction} onSubmit={onSubmit} noValidate className="grid gap-4">
          <NextInput next={next} />
          <input type="hidden" name="intent" value="signup" />
          <Field label="Correo" error={fieldErrors?.email}>
            <Input
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              defaultValue={state.email}
              required
            />
          </Field>
          <Field
            label="Contraseña"
            hint={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`}
            error={fieldErrors?.password}
          >
            <Input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              required
            />
          </Field>
        </form>
        {state.error ? <InlineError>{state.error}</InlineError> : null}
        <p className="text-body text-fg-muted">
          ¿Ya tienes cuenta?{" "}
          <Link href={signInHref} className={linkClass}>
            Ingresa
          </Link>
        </p>
      </div>
      <BottomBar>
        <Button type="submit" form={formId} disabled={isPending}>
          {isPending ? "Creando tu cuenta..." : "Crear cuenta"}
        </Button>
      </BottomBar>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Recuperar y cambiar la contraseña
// ---------------------------------------------------------------------------------------------

export function PasswordResetForm({
  action,
  next,
  signInHref,
}: {
  action: AuthAction;
  next: string | null;
  signInHref: string;
}) {
  const formId = useId();
  const [state, formAction, isPending] = useActionState(action, {});
  const { clientErrors, onSubmit } = useClientValidation(false, false);
  const fieldErrors = clientErrors ?? state.fieldErrors;

  if (state.sent) {
    return (
      <div className="grid gap-6 px-gutter pt-2 pb-8">
        <Title>Revisa tu correo</Title>
        <p className="text-body">
          Si <span className="font-medium">{state.email}</span> tiene una cuenta, te llega un enlace
          para elegir una contraseña nueva. Vence en una hora.
        </p>
        <Link href={signInHref} className={linkClass}>
          Volver a ingresar
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="grid gap-6 px-gutter pt-2 pb-8">
        <Title intro="Te enviamos un enlace para elegir una contraseña nueva.">
          Cambia tu contraseña
        </Title>
        <form id={formId} action={formAction} onSubmit={onSubmit} noValidate className="grid gap-4">
          <NextInput next={next} />
          <Field label="Correo" error={fieldErrors?.email}>
            <Input
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              defaultValue={state.email}
              required
            />
          </Field>
        </form>
        {state.error ? <InlineError>{state.error}</InlineError> : null}
        <Link href={signInHref} className={linkClass}>
          Volver a ingresar
        </Link>
      </div>
      <BottomBar>
        <Button type="submit" form={formId} disabled={isPending}>
          {isPending ? "Enviando..." : "Enviar el enlace"}
        </Button>
      </BottomBar>
    </div>
  );
}

export function NewPasswordForm({ action, next }: { action: AuthAction; next: string | null }) {
  const formId = useId();
  const [state, formAction, isPending] = useActionState(action, {});
  const [clientError, setClientError] = useState<string>();
  const error = clientError ?? state.fieldErrors?.password;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    const input = event.currentTarget.elements.namedItem("password") as HTMLInputElement;
    const found = validatePassword(input.value, true);
    setClientError(found);
    if (found) {
      event.preventDefault();
      input.focus();
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="grid gap-6 px-gutter pt-2 pb-8">
        <Title>Elige tu contraseña nueva</Title>
        <form id={formId} action={formAction} onSubmit={onSubmit} noValidate className="grid gap-4">
          <NextInput next={next} />
          <Field
            label="Contraseña nueva"
            hint={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`}
            error={error}
          >
            <Input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              required
            />
          </Field>
        </form>
        {state.error ? <InlineError>{state.error}</InlineError> : null}
      </div>
      <BottomBar>
        <Button type="submit" form={formId} disabled={isPending}>
          {isPending ? "Guardando..." : "Guardar contraseña"}
        </Button>
      </BottomBar>
    </div>
  );
}
