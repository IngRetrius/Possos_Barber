import type { Metadata } from "next";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Button, List, ListRow } from "@possos/ui";
import { loadAdminPanel } from "../../../../lib/panel";
import { PanelHeader } from "../_components/panel-header";

export const metadata: Metadata = { title: "Barberos · Panel · Possos Barber" };

/** Barberos (administrador): activos e inactivos. */
export default async function BarbersPage() {
  const { barbers } = await loadAdminPanel("/panel/barberos");
  return (
    <>
      <PanelHeader title="Barberos" backHref="/panel/mas">
        <Button asChild variant="secondary" className="shrink-0 px-4">
          <Link href="/panel/barberos/nuevo">
            <Plus aria-hidden="true" strokeWidth={1.5} />
            Nuevo
          </Link>
        </Button>
      </PanelHeader>
      <main className="grid content-start gap-4 px-gutter pt-2 pb-8">
        {barbers.length === 0 ? (
          <p className="text-body text-fg-muted">Todavía no hay barberos.</p>
        ) : (
          <List>
            {barbers.map((b) => (
              <ListRow
                key={b.id}
                title={b.display_name}
                detail={[
                  b.active ? "Activo" : "Inactivo",
                  b.user_id ? "con cuenta" : "sin cuenta",
                ].join(" · ")}
                href={`/panel/barberos/${b.id}`}
              />
            ))}
          </List>
        )}
      </main>
    </>
  );
}
