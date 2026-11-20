import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AUTH_ROUTES, authErrorMessage, safeNext, withNext } from "@possos/auth";
import { getViewer, isGoogleEnabled } from "@possos/auth/server";
import { SignInForm } from "@possos/auth/ui";
import { createClient } from "@possos/supabase/server";
import { currentLocale } from "../../../lib/i18n";
import { destinationAfterSignIn, param } from "../../../lib/session";
import { googleAction, signInAction } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("web.auth.meta"))("signIn") };
}

/** Avisos y errores que llegan por la URL (`?aviso=` y `?error=`). */
const NOTICES = {
  "cuenta-borrada": "accountDeleted",
  // El enlace se abrió en otro navegador: la cuenta quedó activada, pero sin sesión aquí.
  "cuenta-activada": "accountActivated",
} as const;

const ERRORS = { google: "GOOGLE_FAILED", enlace: "LINK_EXPIRED" } as const;

export default async function SignInPage({ searchParams }: PageProps<"/ingresar">) {
  const params = await searchParams;
  const next = safeNext(param(params.next));
  const db = await createClient();
  const viewer = await getViewer(db);
  if (viewer) redirect(await destinationAfterSignIn(db, viewer, next));

  const google = await isGoogleEnabled();
  const t = await getTranslations("web.auth.notices");
  const locale = await currentLocale();
  const notice = NOTICES[param(params.aviso) as keyof typeof NOTICES];
  const error = ERRORS[param(params.error) as keyof typeof ERRORS];
  return (
    <main className="flex flex-1 flex-col">
      <SignInForm
        action={signInAction}
        googleAction={google ? googleAction : undefined}
        next={next}
        signUpHref={withNext(AUTH_ROUTES.signUp, next)}
        resetHref={withNext(AUTH_ROUTES.resetPassword, next)}
        notice={notice ? t(notice) : undefined}
        initialError={error ? authErrorMessage(error, locale) : undefined}
      />
    </main>
  );
}
