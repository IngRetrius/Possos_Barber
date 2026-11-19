import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AUTH_ROUTES, safeNext, withNext } from "@possos/auth";
import { getViewer, isGoogleEnabled } from "@possos/auth/server";
import { SignUpForm } from "@possos/auth/ui";
import { createClient } from "@possos/supabase/server";
import { destinationAfterSignIn, param } from "../../../lib/session";
import { googleAction, signUpAction } from "../actions";

export const metadata: Metadata = { title: "Crea tu cuenta · Possos Barber" };

export default async function SignUpPage({ searchParams }: PageProps<"/registrarse">) {
  const next = safeNext(param((await searchParams).next));
  const db = await createClient();
  const viewer = await getViewer(db);
  if (viewer) redirect(await destinationAfterSignIn(db, viewer, next));

  const google = await isGoogleEnabled();
  return (
    <main className="flex flex-1 flex-col">
      <SignUpForm
        action={signUpAction}
        googleAction={google ? googleAction : undefined}
        next={next}
        signInHref={withNext(AUTH_ROUTES.signIn, next)}
      />
    </main>
  );
}
