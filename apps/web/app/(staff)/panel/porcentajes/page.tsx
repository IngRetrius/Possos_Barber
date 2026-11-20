import type { Metadata } from "next";
import { listCommissionRates } from "@possos/commissions/server";
import { loadAdminPanel } from "../../../../lib/panel";
import { PanelHeader } from "../_components/panel-header";
import { RateForm } from "../_components/settings-forms";

export const metadata: Metadata = { title: "Porcentajes · Panel · Possos Barber" };

/** Porcentaje de cada barbero (administrador). El resto de cada cobro es para la barbería. */
export default async function RatesPage() {
  const { db, barbers } = await loadAdminPanel("/panel/porcentajes");
  const rates = await listCommissionRates(db);
  const byBarber = new Map((rates.ok ? rates.data : []).map((r) => [r.barber_id, r.barber_pct]));
  return (
    <>
      <PanelHeader title="Porcentajes" backHref="/panel/mas" />
      <main className="grid content-start gap-6 px-gutter pb-8">
        <p className="text-body text-fg-muted">
          La parte de cada servicio que es para el barbero; el resto es para la barbería. Cambiarlo
          vale para los cobros nuevos: los que ya están guardados conservan el porcentaje de su día.
        </p>
        {barbers.length === 0 ? (
          <p className="text-body text-fg-muted">Todavía no hay barberos.</p>
        ) : (
          barbers.map((b) => {
            const pct = byBarber.get(b.id);
            return (
              <section key={b.id} className="rounded-card border border-border bg-surface p-4">
                <RateForm
                  barberId={b.id}
                  barberName={b.display_name}
                  pct={pct === undefined ? "" : String(Number(pct)).replace(".", ",")}
                />
              </section>
            );
          })
        )}
      </main>
    </>
  );
}
