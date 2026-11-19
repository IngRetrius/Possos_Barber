import type { Metadata } from "next";
import { requireStaff } from "@possos/auth/server";
import { SignOutButton } from "@possos/auth/ui";
import { createClient } from "@possos/supabase/server";
import { SiteHeader } from "../../_components/site-header";
import { signOutAction } from "../../(auth)/actions";

export const metadata: Metadata = { title: "Panel · Possos Barber" };

/** Inicio del panel. La agenda de hoy llega en F6; por ahora confirma el rol y deja salir. */
export default async function PanelPage() {
  const viewer = await requireStaff(await createClient());
  const roles = [viewer.isAdmin ? "administrador" : null, viewer.barberId ? "barbero" : null]
    .filter(Boolean)
    .join(" y ");

  return (
    <>
      <SiteHeader />
      <main className="grid gap-6 px-gutter pt-2 pb-8">
        <div className="grid gap-2">
          <h1 className="text-title">Panel</h1>
          <p className="text-body text-fg-muted">
            Ingresaste como {roles}
            {viewer.email ? ` con ${viewer.email}` : ""}. Aquí va a estar la agenda de hoy.
          </p>
        </div>
        <SignOutButton action={signOutAction} />
      </main>
    </>
  );
}
