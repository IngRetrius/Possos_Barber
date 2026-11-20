import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { listCommissionRates } from "@possos/commissions/server";
import { loadAdminPanel } from "../../../../lib/panel";
import { PanelHeader } from "../_components/panel-header";
import { RateForm } from "../_components/settings-forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("web.staff.admin.meta"))("rates") };
}

/** Porcentaje de cada barbero (administrador). El resto de cada cobro es para la barbería. */
export default async function RatesPage() {
  const { db, barbers } = await loadAdminPanel("/panel/porcentajes");
  const rates = await listCommissionRates(db);
  const t = await getTranslations("web.staff.admin");
  const byBarber = new Map((rates.ok ? rates.data : []).map((r) => [r.barber_id, r.barber_pct]));
  return (
    <>
      <PanelHeader title={t("rates.title")} backHref="/panel/mas" />
      <main className="grid content-start gap-6 px-gutter pb-8">
        <p className="text-body text-fg-muted">{t("rates.intro")}</p>
        {barbers.length === 0 ? (
          <p className="text-body text-fg-muted">{t("noBarbers")}</p>
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
