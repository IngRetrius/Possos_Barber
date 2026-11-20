import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AUTH_ROUTES, authErrorMessage, safeNext, withNext } from "@possos/auth";
import { PasswordResetForm } from "@possos/auth/ui";
import { InlineError } from "@possos/ui";
import { currentLocale } from "../../../lib/i18n";
import { param } from "../../../lib/session";
import { resetPasswordAction } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("web.auth.meta"))("reset") };
}

export default async function ResetPasswordPage({
  searchParams,
}: PageProps<"/recuperar-contrasena">) {
  const params = await searchParams;
  const next = safeNext(param(params.next));
  const t = await getTranslations("web.auth");
  const code = param(params.error);
  // Con la plantilla de Supabase, el enlace solo funciona en el navegador donde se pidió.
  const error =
    code === "enlace"
      ? authErrorMessage("LINK_EXPIRED", await currentLocale())
      : code === "navegador"
        ? t("otherBrowser")
        : null;
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
