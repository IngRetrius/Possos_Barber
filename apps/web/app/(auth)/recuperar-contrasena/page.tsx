import type { Metadata } from "next";
import { AUTH_ROUTES, authErrorMessage, safeNext, withNext } from "@possos/auth";
import { PasswordResetForm } from "@possos/auth/ui";
import { InlineError } from "@possos/ui";
import { param } from "../../../lib/session";
import { resetPasswordAction } from "../actions";

export const metadata: Metadata = { title: "Cambia tu contraseña · Possos Barber" };

export default async function ResetPasswordPage({
  searchParams,
}: PageProps<"/recuperar-contrasena">) {
  const params = await searchParams;
  const next = safeNext(param(params.next));
  return (
    <main className="flex flex-1 flex-col">
      {param(params.error) === "enlace" ? (
        <InlineError className="px-gutter pt-2">{authErrorMessage("LINK_EXPIRED")}</InlineError>
      ) : null}
      <PasswordResetForm
        action={resetPasswordAction}
        next={next}
        signInHref={withNext(AUTH_ROUTES.signIn, next)}
      />
    </main>
  );
}
