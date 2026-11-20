import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { DeleteAccount, SignOutButton } from "@possos/auth/ui";
import { parsePeriod } from "@possos/booking";
import { getNextAppointment } from "@possos/booking/server";
import { parseColombianMobile } from "@possos/customers";
import { ProfileForm } from "@possos/customers/ui";
import { createClient } from "@possos/supabase/server";
import { atTime } from "@possos/booking";
import { currentFormatters } from "../../../lib/i18n";
import { requireCustomer } from "../../../lib/session";
import { SiteHeader } from "../../_components/site-header";
import { signOutAction } from "../../(auth)/actions";
import { deleteAccountAction, updateProfileAction } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("web.customer.meta"))("profile") };
}

export default async function ProfilePage() {
  const db = await createClient();
  const { viewer, profile } = await requireCustomer(db, "/perfil");
  const t = await getTranslations("web.customer.profile");
  const f = await currentFormatters();
  const phone = profile.phone ? parseColombianMobile(profile.phone) : null;

  const upcoming = await getNextAppointment(db, profile.id);
  const nextStart = upcoming.ok && upcoming.data ? parsePeriod(upcoming.data.period)?.start : null;
  const blockedReason = nextStart
    ? t("blocked", { date: f.date(nextStart), at: atTime(nextStart, f.locale) })
    : undefined;

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <ProfileForm
          action={updateProfileAction}
          heading={
            <div className="grid gap-2">
              <h1 className="text-title">{t("title")}</h1>
              {viewer.email ? (
                <p className="text-body text-fg-muted">
                  {t.rich("signedInAs", {
                    email: () => <span className="text-fg">{viewer.email}</span>,
                  })}
                </p>
              ) : null}
            </div>
          }
          requireConsent={false}
          initial={{
            fullName: profile.full_name,
            phoneNational: phone?.ok ? phone.national : "",
            whatsappOptIn: profile.whatsapp_opt_in,
          }}
          policyHref="/politica-de-datos"
          submitLabel={t("save")}
        >
          <section aria-labelledby="datos" className="grid gap-2 border-t border-border pt-6">
            <h2 id="datos" className="text-heading">
              {t("dataTitle")}
            </h2>
            <p className="text-body text-fg-muted">
              {profile.data_consent_at
                ? t("consentOn", { date: f.date(profile.data_consent_at) })
                : t("consent")}{" "}
              <Link
                href="/politica-de-datos"
                className="text-fg underline underline-offset-4 hover:text-fg-muted"
              >
                {t("readPolicy")}
              </Link>
            </p>
          </section>
          <section aria-label={t("session")} className="grid gap-3 border-t border-border pt-6">
            <SignOutButton action={signOutAction} />
          </section>
          <div className="border-t border-border pt-6">
            <DeleteAccount action={deleteAccountAction} blockedReason={blockedReason} />
          </div>
        </ProfileForm>
      </main>
    </>
  );
}
