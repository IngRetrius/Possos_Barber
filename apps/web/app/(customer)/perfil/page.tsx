import type { Metadata } from "next";
import Link from "next/link";
import { DeleteAccount, SignOutButton } from "@possos/auth/ui";
import { parsePeriod } from "@possos/booking";
import { getNextAppointment } from "@possos/booking/server";
import { parseColombianMobile } from "@possos/customers";
import { ProfileForm } from "@possos/customers/ui";
import { createClient } from "@possos/supabase/server";
import { formatDate, formatTime } from "@possos/ui";
import { requireCustomer } from "../../../lib/session";
import { signOutAction } from "../../(auth)/actions";
import { deleteAccountAction, updateProfileAction } from "../actions";

export const metadata: Metadata = { title: "Tu perfil · Possos Barber" };

export default async function ProfilePage() {
  const db = await createClient();
  const { viewer, profile } = await requireCustomer(db, "/perfil");
  const phone = profile.phone ? parseColombianMobile(profile.phone) : null;

  const upcoming = await getNextAppointment(db, profile.id);
  const nextStart = upcoming.ok && upcoming.data ? parsePeriod(upcoming.data.period)?.start : null;
  const blockedReason = nextStart
    ? `Tienes una cita el ${formatDate(nextStart)} a las ${formatTime(nextStart)}. Cancélala antes de borrar tu cuenta.`
    : undefined;

  return (
    <main className="flex flex-1 flex-col">
      <ProfileForm
        action={updateProfileAction}
        heading={
          <div className="grid gap-2">
            <h1 className="text-title">Tu perfil</h1>
            {viewer.email ? (
              <p className="text-body text-fg-muted">
                Ingresas con <span className="text-fg">{viewer.email}</span>
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
        submitLabel="Guardar cambios"
      >
        <section aria-labelledby="datos" className="grid gap-2 border-t border-border pt-6">
          <h2 id="datos" className="text-heading">
            Tus datos
          </h2>
          <p className="text-body text-fg-muted">
            Autorizaste el tratamiento de tus datos
            {profile.data_consent_at ? ` el ${formatDate(profile.data_consent_at)}` : ""}.{" "}
            <Link
              href="/politica-de-datos"
              className="text-fg underline underline-offset-4 hover:text-fg-muted"
            >
              Ver la política de tratamiento de datos
            </Link>
          </p>
        </section>
        <section aria-label="Sesión" className="grid gap-3 border-t border-border pt-6">
          <SignOutButton action={signOutAction} />
        </section>
        <div className="border-t border-border pt-6">
          <DeleteAccount action={deleteAccountAction} blockedReason={blockedReason} />
        </div>
      </ProfileForm>
    </main>
  );
}
