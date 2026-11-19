"use server";

import { redirect } from "next/navigation";
import {
  AUTH_ROUTES,
  authErrorMessage,
  safeNext,
  validateCredentials,
  validateEmail,
  validatePassword,
  withNext,
  type AuthFormState,
} from "@possos/auth";
import {
  getViewer,
  resendConfirmation,
  sendPasswordReset,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  startGoogleSignIn,
  updatePassword,
} from "@possos/auth/server";
import { createClient } from "@possos/supabase/server";
import { CUSTOMER_HOME, destinationAfterSignIn, siteOrigin } from "../../lib/session";

/*
 * Acciones de ingreso. Cada una verifica la sesión por su cuenta (no confía en el proxy).
 * Los enlaces del correo vuelven a `next` (o al inicio del cliente) pasando por
 * /auth/confirmar, que decide si falta completar el perfil.
 */

const text = (value: FormDataEntryValue | null) => (typeof value === "string" ? value : "");

async function emailReturnUrl(next: string | null): Promise<string> {
  return `${await siteOrigin()}${next ?? CUSTOMER_HOME}`;
}

/** Reenvía el correo de activación. Supabase limita los reenvíos (60 s en producción). */
async function resend(email: string, next: string | null): Promise<AuthFormState> {
  const emailError = validateEmail(email);
  if (emailError) return { email, fieldErrors: { email: emailError } };
  const db = await createClient();
  const result = await resendConfirmation(db, { email, redirectTo: await emailReturnUrl(next) });
  return result.ok ? { email, sent: true } : { email, error: authErrorMessage(result.error) };
}

export async function signInAction(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = text(form.get("email")).trim();
  const next = safeNext(form.get("next"));
  if (form.get("intent") === "resend") {
    // Si el reenvío falla, el botón "Reenviar el enlace" sigue a la mano.
    const state = await resend(email, next);
    return state.sent ? state : { ...state, unconfirmed: true };
  }

  const password = text(form.get("password"));
  const fieldErrors = validateCredentials({ email, password }, { checkLength: false });
  if (fieldErrors) return { email, fieldErrors };

  const db = await createClient();
  const result = await signInWithPassword(db, { email, password });
  if (!result.ok) {
    return {
      email,
      error: authErrorMessage(result.error),
      unconfirmed: result.error === "EMAIL_NOT_CONFIRMED",
    };
  }
  const viewer = await getViewer(db);
  if (!viewer) return { email, error: authErrorMessage("UNKNOWN") };
  redirect(await destinationAfterSignIn(db, viewer, next));
}

export async function signUpAction(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = text(form.get("email")).trim();
  const next = safeNext(form.get("next"));
  // El reenvío se pide desde "Revisa tu correo": esa vista se queda aunque falle.
  if (form.get("intent") === "resend") return { ...(await resend(email, next)), sent: true };

  const password = text(form.get("password"));
  const fieldErrors = validateCredentials({ email, password }, { checkLength: true });
  if (fieldErrors) return { email, fieldErrors };

  const db = await createClient();
  const result = await signUpWithPassword(db, {
    email,
    password,
    redirectTo: await emailReturnUrl(next),
  });
  if (!result.ok) {
    return result.error === "WEAK_PASSWORD" || result.error === "INVALID_EMAIL"
      ? {
          email,
          fieldErrors: {
            [result.error === "WEAK_PASSWORD" ? "password" : "email"]: authErrorMessage(
              result.error,
            ),
          },
        }
      : { email, error: authErrorMessage(result.error) };
  }
  return { email, sent: true };
}

export async function googleAction(form: FormData): Promise<void> {
  const next = safeNext(form.get("next"));
  const callback = `${await siteOrigin()}${withNext(AUTH_ROUTES.oauthCallback, next)}`;
  const db = await createClient();
  const result = await startGoogleSignIn(db, callback);
  if (!result.ok) redirect(withNext(`${AUTH_ROUTES.signIn}?error=google`, next));
  redirect(result.data.url);
}

export async function resetPasswordAction(
  _prev: AuthFormState,
  form: FormData,
): Promise<AuthFormState> {
  const email = text(form.get("email")).trim();
  const next = safeNext(form.get("next"));
  const emailError = validateEmail(email);
  if (emailError) return { email, fieldErrors: { email: emailError } };

  const db = await createClient();
  const redirectTo = `${await siteOrigin()}${withNext(AUTH_ROUTES.newPassword, next)}`;
  const result = await sendPasswordReset(db, { email, redirectTo });
  // Igual exista o no la cuenta, para no revelar qué correos están registrados.
  if (!result.ok && result.error === "RATE_LIMITED") {
    return { email, error: authErrorMessage(result.error) };
  }
  return { email, sent: true };
}

export async function newPasswordAction(
  _prev: AuthFormState,
  form: FormData,
): Promise<AuthFormState> {
  const password = text(form.get("password"));
  const next = safeNext(form.get("next"));
  const passwordError = validatePassword(password, true);
  if (passwordError) return { fieldErrors: { password: passwordError } };

  const db = await createClient();
  const viewer = await getViewer(db);
  if (!viewer) return { error: authErrorMessage("LINK_EXPIRED") };
  const result = await updatePassword(db, password);
  if (!result.ok) {
    return result.error === "WEAK_PASSWORD" || result.error === "SAME_PASSWORD"
      ? { fieldErrors: { password: authErrorMessage(result.error) } }
      : { error: authErrorMessage(result.error) };
  }
  redirect(await destinationAfterSignIn(db, viewer, next));
}

export async function signOutAction(): Promise<void> {
  const db = await createClient();
  await signOut(db);
  redirect(AUTH_ROUTES.signIn);
}
