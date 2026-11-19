import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AUTH_ROUTES, authErrorMessage, safeNext, withNext } from "@possos/auth";
import { getViewer, isGoogleEnabled } from "@possos/auth/server";
import { SignInForm } from "@possos/auth/ui";
import { createClient } from "@possos/supabase/server";
import { destinationAfterSignIn, param } from "../../../lib/session";
import { googleAction, signInAction } from "../actions";

export const metadata: Metadata = { title: "Ingresa · Possos Barber" };

const NOTICES: Record<string, string> = {
  "cuenta-borrada": "Borramos tu cuenta y tus datos.",
  // El enlace se abrió en otro navegador: la cuenta quedó activada, pero sin sesión aquí.
  "cuenta-activada": "Tu correo quedó confirmado. Ingresa con tu contraseña para seguir.",
};

const ERRORS: Record<string, string> = {
  google: authErrorMessage("GOOGLE_FAILED"),
  enlace: authErrorMessage("LINK_EXPIRED"),
};

export default async function SignInPage({ searchParams }: PageProps<"/ingresar">) {
  const params = await searchParams;
  const next = safeNext(param(params.next));
  const db = await createClient();
  const viewer = await getViewer(db);
  if (viewer) redirect(await destinationAfterSignIn(db, viewer, next));

  const google = await isGoogleEnabled();
  return (
    <main className="flex flex-1 flex-col">
      <SignInForm
        action={signInAction}
        googleAction={google ? googleAction : undefined}
        next={next}
        signUpHref={withNext(AUTH_ROUTES.signUp, next)}
        resetHref={withNext(AUTH_ROUTES.resetPassword, next)}
        notice={NOTICES[param(params.aviso) ?? ""]}
        initialError={ERRORS[param(params.error) ?? ""]}
      />
    </main>
  );
}
