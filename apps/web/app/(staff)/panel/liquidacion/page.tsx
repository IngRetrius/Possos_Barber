import type { Metadata } from "next";
import Link from "next/link";
import { listAgendaByIds } from "@possos/booking/server";
import {
  formatPercent,
  periodRange,
  SETTLEMENT_PERIODS,
  type SettlementPeriod,
} from "@possos/commissions";
import { getSettlement, listCharges, listCommissionRates } from "@possos/commissions/server";
import { Button, cn, Field, formatDate, formatPrice, Input } from "@possos/ui";
import { loadPanel } from "../../../../lib/panel";
import { parseDay, todayKey } from "../../../../lib/panel-dates";
import { param } from "../../../../lib/session";
import { AutoSubmitSelect } from "../_components/auto-submit-select";
import { ChargesList } from "../_components/charges-list";
import { PanelHeader } from "../_components/panel-header";

export const metadata: Metadata = { title: "Liquidación · Panel · Possos Barber" };

const ALL = "todos";

/**
 * Liquidación (docs/11, "Más"): periodo, total cobrado, parte del barbero y de la barbería,
 * número de servicios y la lista de cobros. El administrador elige el barbero o ve la barbería
 * completa; el barbero solo ve la suya (get_settlement lo exige). Nunca se dice "factura".
 */
export default async function SettlementPage({ searchParams }: PageProps<"/panel/liquidacion">) {
  const params = await searchParams;
  const ctx = await loadPanel("/panel/liquidacion");
  const today = todayKey();
  const isAdmin = ctx.viewer.isAdmin;

  const periodParam = param(params.periodo) as SettlementPeriod | undefined;
  const period: SettlementPeriod = SETTLEMENT_PERIODS.some((p) => p.value === periodParam)
    ? periodParam!
    : "semana";
  let from: string;
  let to: string;
  const desde = parseDay(param(params.desde));
  const hasta = parseDay(param(params.hasta));
  if (period === "rango" && desde && hasta && desde <= hasta) {
    from = desde;
    to = hasta;
  } else {
    ({ from, to } = periodRange(period === "rango" ? "mes" : period, today));
  }

  const barberParam = param(params.barbero);
  const barberId = isAdmin
    ? barberParam === ALL
      ? undefined
      : (ctx.barbers.find((b) => b.id === barberParam)?.id ?? ctx.barber?.id)
    : (ctx.viewer.barberId ?? undefined);
  const barberValue = barberId ?? ALL;

  const [settlement, charges, rates] = await Promise.all([
    getSettlement(ctx.db, { from, to, barberId }),
    listCharges(ctx.db, { from, to, barberId }),
    listCommissionRates(ctx.db),
  ]);
  const appointments = await listAgendaByIds(
    ctx.db,
    charges.ok ? charges.data.map((c) => c.appointment_id) : [],
  );
  const byAppointment = new Map((appointments.ok ? appointments.data : []).map((a) => [a.id, a]));
  const names = new Map(ctx.barbers.map((b) => [b.id, b.display_name]));

  const rows = settlement.ok ? settlement.data : [];
  const total = rows.reduce(
    (t, r) => ({
      count: t.count + r.services_count,
      amount: t.amount + Number(r.amount_cop),
      barber: t.barber + Number(r.barber_amount_cop),
      business: t.business + Number(r.business_amount_cop),
    }),
    { count: 0, amount: 0, barber: 0, business: 0 },
  );
  const rate = barberId
    ? (rates.ok ? rates.data : []).find((r) => r.barber_id === barberId)
    : undefined;

  const href = (query: Record<string, string>) =>
    `/panel/liquidacion?${new URLSearchParams({ barbero: barberValue, ...query })}`;

  return (
    <>
      <PanelHeader title="Liquidación" backHref="/panel/mas" />
      <main className="grid content-start gap-6 px-gutter pb-8">
        <nav aria-label="Periodo" className="-mx-gutter overflow-x-auto px-gutter">
          <ul className="flex gap-2">
            {SETTLEMENT_PERIODS.map((p) => (
              <li key={p.value}>
                <Link
                  href={href({ periodo: p.value })}
                  aria-current={p.value === period ? "page" : undefined}
                  className={cn(
                    "inline-flex h-12 items-center rounded-pill border px-4 text-label whitespace-nowrap",
                    p.value === period
                      ? "border-fg bg-fg text-bg"
                      : "border-border-strong text-fg hover:bg-surface-2",
                  )}
                >
                  {p.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {period === "rango" ? (
          <form action="/panel/liquidacion" className="grid gap-3">
            <input type="hidden" name="periodo" value="rango" />
            <input type="hidden" name="barbero" value={barberValue} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Desde" className="min-w-0">
                <Input
                  type="date"
                  name="desde"
                  defaultValue={from}
                  className="w-0 min-w-full px-3"
                />
              </Field>
              <Field label="Hasta" className="min-w-0">
                <Input type="date" name="hasta" defaultValue={to} className="w-0 min-w-full px-3" />
              </Field>
            </div>
            <Button type="submit" variant="secondary">
              Ver el rango
            </Button>
          </form>
        ) : null}

        {isAdmin ? (
          <form action="/panel/liquidacion">
            <input type="hidden" name="periodo" value={period} />
            {period === "rango" ? (
              <>
                <input type="hidden" name="desde" value={from} />
                <input type="hidden" name="hasta" value={to} />
              </>
            ) : null}
            <AutoSubmitSelect name="barbero" label="Liquidación de" defaultValue={barberValue}>
              <option value={ALL}>Toda la barbería</option>
              {ctx.barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.display_name}
                  {b.active ? "" : " (inactivo)"}
                </option>
              ))}
            </AutoSubmitSelect>
            <noscript>
              <Button type="submit" variant="secondary" className="mt-2 w-full">
                Ver
              </Button>
            </noscript>
          </form>
        ) : null}

        <section aria-labelledby="totales" className="grid gap-4">
          <h2 id="totales" className="sr-only">
            Totales
          </h2>
          <p className="text-body text-fg-muted tabular-nums">
            {from === to ? formatDate(from) : `${formatDate(from)} a ${formatDate(to)}`}
          </p>
          {!settlement.ok ? (
            <p role="alert" className="text-body text-danger">
              No pudimos cargar la liquidación. Revisa tu conexión e intenta de nuevo
            </p>
          ) : (
            <dl className="grid grid-cols-2 gap-4 rounded-card border border-border bg-surface p-4 tabular-nums">
              <div className="col-span-2 grid gap-1">
                <dt className="text-label text-fg-muted">Total cobrado</dt>
                <dd className="text-title" data-testid="total">
                  {formatPrice(total.amount)}
                </dd>
              </div>
              <div className="grid gap-1">
                <dt className="text-label text-fg-muted">
                  {barberId && barberId === ctx.viewer.barberId ? "Para ti" : "Para el barbero"}
                  {rate ? ` (${formatPercent(Number(rate.barber_pct))} hoy)` : ""}
                </dt>
                <dd className="text-heading" data-testid="barbero">
                  {formatPrice(total.barber)}
                </dd>
              </div>
              <div className="grid gap-1">
                <dt className="text-label text-fg-muted">Para la barbería</dt>
                <dd className="text-heading" data-testid="barberia">
                  {formatPrice(total.business)}
                </dd>
              </div>
              <div className="col-span-2 grid gap-1">
                <dt className="sr-only">Servicios</dt>
                <dd className="text-body text-fg-muted">
                  {total.count === 1 ? "1 servicio" : `${total.count} servicios`}
                </dd>
              </div>
            </dl>
          )}
          <p className="text-caption text-fg-muted">
            Cada cobro guarda el porcentaje que había ese día: cambiarlo no cambia los periodos
            anteriores. Los anulados no cuentan.
          </p>
        </section>

        <section aria-labelledby="cobros" className="grid gap-3">
          <h2 id="cobros" className="text-heading">
            Cobros
          </h2>
          {!charges.ok ? (
            <p role="alert" className="text-body text-danger">
              No pudimos cargar los cobros. Revisa tu conexión e intenta de nuevo
            </p>
          ) : charges.data.length === 0 ? (
            <p className="text-body text-fg-muted">No hay cobros en este periodo.</p>
          ) : (
            <ChargesList
              isAdmin={isAdmin}
              viewerBarberId={ctx.viewer.barberId}
              today={today}
              rows={charges.data.map((c) => {
                const a = byAppointment.get(c.appointment_id);
                return {
                  charge: c,
                  customerName: a?.customerName ?? "Cliente",
                  serviceName: a?.serviceName ?? "",
                  barberName: barberId ? null : (names.get(c.barber_id) ?? null),
                };
              })}
            />
          )}
        </section>
      </main>
    </>
  );
}
