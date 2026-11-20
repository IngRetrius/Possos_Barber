import type { Metadata } from "next";
import { listBookingStatus } from "@possos/booking/server";
import { formatPhone } from "@possos/customers";
import { searchCustomers } from "@possos/customers/server";
import { Field, Input, List, ListRow, StatusBadge } from "@possos/ui";
import { loadPanel } from "../../../../lib/panel";
import { param } from "../../../../lib/session";

export const metadata: Metadata = { title: "Clientes · Panel · Possos Barber" };

/**
 * "Clientes": los que la sesión puede ver (el barbero, solo los que tuvieron cita con él o que
 * registró; el administrador, todos), con búsqueda, inasistencias y la marca de aprobación.
 */
export default async function CustomersPage({ searchParams }: PageProps<"/panel/clientes">) {
  const params = await searchParams;
  const ctx = await loadPanel("/panel/clientes");
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
        <h1 className="pt-4 text-title">Clientes</h1>
        <form role="search" action="/panel/clientes">
          <Field label="Buscar por nombre o celular">
            <Input type="search" name="q" defaultValue={query} enterKeyHint="search" />
          </Field>
        </form>
      </header>
      {!found.ok ? (
        <p role="alert" className="px-gutter text-body text-danger">
          No pudimos cargar los clientes. Revisa tu conexión e intenta de nuevo
        </p>
      ) : customers.length === 0 ? (
        <p className="px-gutter text-body text-fg-muted">
          {query
            ? "No encontramos clientes con ese nombre o celular."
            : "Todavía no tienes clientes."}
        </p>
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
                    {c.phone ? formatPhone(c.phone) : "Sin celular"}
                    {noShows
                      ? ` · ${noShows === 1 ? "1 inasistencia" : `${noShows} inasistencias`}`
                      : ""}
                  </>
                }
                value={
                  s?.requires_approval ? (
                    <StatusBadge tone="warning">Necesita aprobación</StatusBadge>
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
