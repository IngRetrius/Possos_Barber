import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { safeNext, withNext } from "@possos/auth";
import { requireViewer } from "@possos/auth/server";
import { needsConsent, parseColombianMobile } from "@possos/customers";
import { getMyProfile } from "@possos/customers/server";
import { ProfileForm } from "@possos/customers/ui";
import { createClient } from "@possos/supabase/server";
import { CUSTOMER_HOME, COMPLETE_PROFILE, param } from "../../../lib/session";
import { completeProfileAction } from "../../(customer)/actions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("web.auth.meta"))("completeProfile") };
}

/**
 * Primer ingreso: nombre, celular y las dos autorizaciones. También aparece si cambió la
 * versión de la política de datos (entonces dice que se actualizó).
 */
export default async function CompleteProfilePage({
  searchParams,
}: PageProps<"/completar-perfil">) {
  const next = safeNext(param((await searchParams).next));
  const db = await createClient();
  const viewer = await requireViewer(db, withNext(COMPLETE_PROFILE, next));
  const profile = await getMyProfile(db, viewer.userId);
  if (!profile.ok) throw new Error(`No se pudo leer el perfil: ${profile.error}`);
  if (!needsConsent(profile.data)) redirect(next ?? CUSTOMER_HOME);

  const current = profile.data;
  const phone = current?.phone ? parseColombianMobile(current.phone) : null;
  const updatedPolicy = current !== null;
  const t = await getTranslations("web.auth.completeProfile");

  return (
    <main className="flex flex-1 flex-col">
      <ProfileForm
        action={completeProfileAction}
        heading={
          <div className="grid gap-2">
            <h1 className="text-title">{updatedPolicy ? t("updatedTitle") : t("title")}</h1>
            <p className="text-body text-fg-muted">
              {updatedPolicy ? t("updatedIntro") : t("intro")}
            </p>
          </div>
        }
        requireConsent
        initial={{
          fullName: current?.full_name ?? viewer.providerName ?? "",
          phoneNational: phone?.ok ? phone.national : "",
          whatsappOptIn: current?.whatsapp_opt_in ?? false,
        }}
        policyHref="/politica-de-datos"
        next={next}
        submitLabel={t("submit")}
      />
    </main>
  );
}
