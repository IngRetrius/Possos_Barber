import "server-only";
import { notFound, redirect } from "next/navigation";
import type { DbClient, Result } from "@possos/supabase";
import { getAuthSettings } from "@possos/supabase/server";
import { AUTH_ROUTES, withNext, type Viewer } from "./index";
import { authErrorCode, type AuthErrorCode } from "./internal/errors";

/**
 * API de servidor de auth. Recibe el cliente de la sesión (`@possos/supabase/server`).
 *
 * Los roles salen de la base (`is_admin()` y `current_barber_id()`), nunca del navegador ni de
 * los metadatos del usuario, que el propio usuario puede cambiar.
 */

type R<T> = Promise<Result<T, AuthErrorCode>>;

const fail = (error: { code?: string; message?: string } | null) =>
  ({ ok: false, error: authErrorCode(error) }) as const;

// ---------------------------------------------------------------------------------------------
// Sesión y roles
// ---------------------------------------------------------------------------------------------

/** Quién usa la app, o null sin sesión. La sesión se verifica con `getClaims`. */
export async function getViewer(db: DbClient): Promise<Viewer | null> {
  const { data } = await db.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const [admin, barber] = await Promise.all([db.rpc("is_admin"), db.rpc("current_barber_id")]);
  // Si la base no responde, se trata como cliente: menos permisos, nunca más.
  const isAdmin = admin.data === true;
  const barberId = typeof barber.data === "string" ? barber.data : null;
  const meta = (claims.user_metadata ?? {}) as Record<string, unknown>;
  const providerName =
    typeof meta.full_name === "string"
      ? meta.full_name
      : typeof meta.name === "string"
        ? meta.name
        : null;

  return {
    userId: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    providerName,
    isAdmin,
    barberId,
    isStaff: isAdmin || barberId !== null,
  };
}

/** Exige sesión. Sin sesión, va a ingresar y vuelve a `next`. */
export async function requireViewer(db: DbClient, next: string): Promise<Viewer> {
  const viewer = await getViewer(db);
  if (!viewer) redirect(withNext(AUTH_ROUTES.signIn, next));
  return viewer;
}

/** Exige administrador o barbero. Un cliente recibe 404: el panel no existe para él. */
export async function requireStaff(db: DbClient, next = "/panel"): Promise<Viewer> {
  const viewer = await requireViewer(db, next);
  if (!viewer.isStaff) notFound();
  return viewer;
}

/** Exige administrador. */
export async function requireAdmin(db: DbClient, next = "/panel"): Promise<Viewer> {
  const viewer = await requireViewer(db, next);
  if (!viewer.isAdmin) notFound();
  return viewer;
}

// ---------------------------------------------------------------------------------------------
// Ingreso y registro
// ---------------------------------------------------------------------------------------------

/**
 * Si el ingreso con Google está activo en Supabase. Apagado (en local, en CI o mientras no se
 * configure en producción), el botón no se muestra: Supabase respondería con un error crudo.
 */
export async function isGoogleEnabled(): Promise<boolean> {
  const settings = await getAuthSettings();
  return settings?.external.google === true;
}

export async function signInWithPassword(
  db: DbClient,
  input: { email: string; password: string },
): R<{ userId: string }> {
  const { data, error } = await db.auth.signInWithPassword({
    email: input.email.trim(),
    password: input.password,
  });
  if (error || !data.user) return fail(error);
  return { ok: true, data: { userId: data.user.id } };
}

/**
 * Crea la cuenta con correo y contraseña. Supabase manda el correo de activación con un
 * enlace a `/auth/confirmar` que vuelve a `redirectTo` (URL absoluta, en la lista de
 * redirecciones permitidas de Supabase).
 *
 * Si el correo ya tiene cuenta, Supabase responde igual que si fuera nuevo (no revela qué
 * correos existen) y no manda nada: la pantalla dice lo mismo en los dos casos.
 */
export async function signUpWithPassword(
  db: DbClient,
  input: { email: string; password: string; redirectTo: string },
): R<null> {
  const { error } = await db.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: { emailRedirectTo: input.redirectTo },
  });
  return error ? fail(error) : { ok: true, data: null };
}

/** Reenvía el correo de activación. */
export async function resendConfirmation(
  db: DbClient,
  input: { email: string; redirectTo: string },
): R<null> {
  const { error } = await db.auth.resend({
    type: "signup",
    email: input.email.trim(),
    options: { emailRedirectTo: input.redirectTo },
  });
  return error ? fail(error) : { ok: true, data: null };
}

/**
 * Empieza el ingreso con Google. Devuelve la URL de Google a la que hay que redirigir.
 * `redirectTo` es la ruta de callback (`/auth/callback?next=...`) como URL absoluta.
 * El verificador de PKCE queda en una cookie; por eso el callback debe abrirse en el mismo
 * navegador (riesgo 6 de docs/10 con la PWA en iOS).
 */
export async function startGoogleSignIn(db: DbClient, redirectTo: string): R<{ url: string }> {
  const { data, error } = await db.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, queryParams: { prompt: "select_account" } },
  });
  if (error || !data.url) return fail(error);
  return { ok: true, data: { url: data.url } };
}

/** Callback de OAuth: cambia el código por la sesión. */
export async function exchangeCode(db: DbClient, code: string): R<null> {
  const { error } = await db.auth.exchangeCodeForSession(code);
  return error ? fail(error) : { ok: true, data: null };
}

/** Enlace del correo (activación o cambio de contraseña): verifica el token y abre la sesión. */
export async function verifyEmailLink(
  db: DbClient,
  input: { tokenHash: string; type: "email" | "recovery" },
): R<null> {
  const { error } = await db.auth.verifyOtp({ token_hash: input.tokenHash, type: input.type });
  return error ? fail(error) : { ok: true, data: null };
}

/**
 * Manda el correo para cambiar la contraseña. Responde lo mismo exista o no la cuenta.
 * `redirectTo` es la URL absoluta de la pantalla de contraseña nueva.
 */
export async function sendPasswordReset(
  db: DbClient,
  input: { email: string; redirectTo: string },
): R<null> {
  const { error } = await db.auth.resetPasswordForEmail(input.email.trim(), {
    redirectTo: input.redirectTo,
  });
  return error ? fail(error) : { ok: true, data: null };
}

/** Cambia la contraseña de la sesión actual (después del enlace de recuperación). */
export async function updatePassword(db: DbClient, password: string): R<null> {
  const { error } = await db.auth.updateUser({ password });
  return error ? fail(error) : { ok: true, data: null };
}

/** Cierra la sesión en este dispositivo. */
export async function signOut(db: DbClient): Promise<void> {
  await db.auth.signOut({ scope: "local" });
}

/**
 * Borra la cuenta del cliente (Ley 1581). La base borra el usuario de Auth y deja su perfil
 * sin datos personales; el personal recibe `FORBIDDEN`. Cierra la sesión al terminar.
 */
export async function deleteMyAccount(db: DbClient): R<null> {
  const { error } = await db.rpc("delete_my_account");
  if (error) return fail(error);
  await signOut(db);
  return { ok: true, data: null };
}
