import type { Metadata } from "next";
import { AUTH_ROUTES, authErrorMessage, safeNext, withNext } from "@possos/auth";
import { PasswordResetForm } from "@possos/auth/ui";
import { InlineError } from "@possos/ui";
import { param } from "../../../lib/session";
import { resetPasswordAction } from "../actions";

export const metadata: Metadata = { title: "Cambia tu contraseña · Possos Barber" };

const ERRORS: Record<string, string> = {
  enlace: authErrorMessage("LINK_EXPIRED"),
  // Con la plantilla de Supabase, el enlace solo funciona en el navegador donde se pidió.
  navegador:
    "Abre el enlace en el mismo navegador donde pediste el cambio, o pide uno nuevo desde aquí.",
};

export default async function ResetPasswordPage({
  searchParams,
}: PageProps<"/recuperar-contrasena">) {
  const params = await searchParams;
  const next = safeNext(param(params.next));
  const error = ERRORS[param(params.error) ?? ""];
  return (
    <main className="flex flex-1 flex-col">
      {error ? <InlineError className="px-gutter pt-2">{error}</InlineError> : null}
      <PasswordResetForm
        action={resetPasswordAction}
        next={next}
        signInHref={withNext(AUTH_ROUTES.signIn, next)}
      />
    </main>
  );
}
