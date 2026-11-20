import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { listBookingStatus } from "@possos/booking/server";
import { formatPhone } from "@possos/customers";
import { searchCustomers } from "@possos/customers/server";
import { Field, Input, List, ListRow, StatusBadge } from "@possos/ui";
import { loadPanel } from "../../../../lib/panel";
import { param } from "../../../../lib/session";
import { LocaleSwitch } from "../../../_components/locale-switch";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("web.staff.meta"))("customers") };
}

/**
 * "Clientes": los que la sesión puede ver (el barbero, solo los que tuvieron cita con él o que
 * registró; el administrador, todos), con búsqueda, inasistencias y la marca de aprobación.
 */
export default async function CustomersPage({ searchParams }: PageProps<"/panel/clientes">) {
  const params = await searchParams;
  const ctx = await loadPanel("/panel/clientes");
  const t = await getTranslations("web.staff.customers");
  const query = param(params.q)?.slice(0, 60) ?? "";
  const found = await searchCustomers(ctx.db, { query, limit: 50 });
  const customers = found.ok ? found.data : [];
  const status = await listBookingStatus(
    ctx.db,
    customers.map((c) => c.id),
  );
  const byId = new Map((status.ok ? status.data : []).map((s) => [s.customer_id, s]));

  return (
    <main className="grid content-start gap-5 pb-6">
      <header className="grid gap-4 px-gutter pt-safe">
        <div className="flex items-center justify-between gap-3 pt-4">
          <h1 className="text-title">{t("title")}</h1>
          <LocaleSwitch />
        </div>
        <form role="search" action="/panel/clientes">
          <Field label={t("search")}>
            <Input type="search" name="q" defaultValue={query} enterKeyHint="search" />
          </Field>
        </form>
      </header>
      {!found.ok ? (
        <p role="alert" className="px-gutter text-body text-danger">
          {t("loadError")}
        </p>
      ) : customers.length === 0 ? (
        <p className="px-gutter text-body text-fg-muted">{query ? t("noResults") : t("empty")}</p>
      ) : (
        <List className="mx-gutter">
          {customers.map((c) => {
            const s = byId.get(c.id);
            const noShows = s?.no_show_count ?? 0;
            return (
              <ListRow
                key={c.id}
                title={c.full_name}
                href={`/panel/clientes/${c.id}`}
                detail={
                  <>
                    {c.phone ? formatPhone(c.phone) : t("noPhone")}
                    {noShows ? ` · ${t("noShows", { count: noShows })}` : ""}
                  </>
                }
                value={
                  s?.requires_approval ? (
                    <StatusBadge tone="warning">{t("needsApproval")}</StatusBadge>
                  ) : undefined
                }
              />
            );
          })}
        </List>
      )}
    </main>
  );
}
