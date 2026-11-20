import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AUTH_ROUTES, safeNext } from "@possos/auth";
import { requireViewer } from "@possos/auth/server";
import { NewPasswordForm } from "@possos/auth/ui";
import { createClient } from "@possos/supabase/server";
import { param } from "../../../lib/session";
import { newPasswordAction } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("web.auth.meta"))("newPassword") };
}

/** Llega aquí con la sesión que abrió el enlace del correo (/auth/confirmar, type=recovery). */
export default async function NewPasswordPage({ searchParams }: PageProps<"/nueva-contrasena">) {
  const next = safeNext(param((await searchParams).next));
  await requireViewer(await createClient(), AUTH_ROUTES.newPassword);
  return (
    <main className="flex flex-1 flex-col">
      <NewPasswordForm action={newPasswordAction} next={next} />
    </main>
  );
}
