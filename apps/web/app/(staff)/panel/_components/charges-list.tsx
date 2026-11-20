"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import type { Charge } from "@possos/commissions";
import { formatPercent } from "@possos/commissions";
import { ChargeForm } from "@possos/commissions/ui";
import { Button, cn, Sheet, toast, toDateKey, useFormat } from "@possos/ui";
import { updateChargeAction, voidChargeAction, type ActionResult } from "../_actions/agenda";
import { ReasonForm } from "./reason-form";

export interface ChargeRow {
  charge: Charge;
  customerName: string;
  serviceName: string;
  /** Nombre del barbero, solo cuando se ve la barbería completa. */
  barberName: string | null;
}

/**
 * Lista de cobros de la liquidación (docs/11): fecha, cliente, servicio y valor; los anulados
 * tachados con su motivo. Tocar uno abre una hoja para corregir el valor (el barbero, los de
 * hoy; el administrador, siempre) o anularlo con motivo (administrador).
 */
export function ChargesList({
  rows,
  isAdmin,
  viewerBarberId,
  today,
}: {
  rows: ChargeRow[];
  isAdmin: boolean;
  viewerBarberId: string | null;
  today: string;
}) {
  const t = useTranslations("web.agenda");
  const f = useFormat();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"detail" | "correct" | "void">("detail");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const selected = rows.find((r) => r.charge.id === selectedId) ?? null;

  const run = (action: () => Promise<ActionResult>) => {
    setError(null);
    start(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.message) toast(result.message);
      setSelectedId(null);
      router.refresh();
    });
  };

  const canCorrect = (c: Charge) => !c.voided_at && (isAdmin || toDateKey(c.charged_at) === today);

  return (
    <>
      <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
        {rows.map(({ charge: c, customerName, serviceName, barberName }) => {
          const voided = Boolean(c.voided_at);
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode("detail");
                  setSelectedId(c.id);
                }}
                className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2"
              >
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="truncate text-label">{customerName}</span>
                  <span className="truncate text-caption text-fg-muted tabular-nums">
                    {f.date(c.charged_at)} · {serviceName}
                    {barberName ? ` · ${barberName}` : ""}
                  </span>
                  {voided ? (
                    <span className="truncate text-caption text-fg-muted">
                      {t("voided", { reason: c.void_reason ?? "" })}
                    </span>
                  ) : null}
                </span>
                <span
                  className={cn(
                    "shrink-0 text-label tabular-nums",
                    voided && "text-fg-muted line-through",
                  )}
                >
                  {f.price(c.amount_cop)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <Sheet
        open={selected !== null}
        onOpenChange={(next) => {
          if (!next) setSelectedId(null);
        }}
        title={mode === "void" ? t("sheet.void") : t("sheet.charge")}
        description={selected ? `${selected.customerName} · ${selected.serviceName}` : undefined}
      >
        {selected ? (
          mode === "correct" ? (
            <ChargeForm
              defaultAmount={selected.charge.amount_cop}
              barberPct={Number(selected.charge.barber_pct)}
              barberLabel={
                selected.charge.barber_id === viewerBarberId ? t("forYou") : t("forBarber")
              }
              submitLabel={t("saveValue")}
              pendingLabel={t("saving")}
              pending={pending}
              error={error}
              onCancel={() => setMode("detail")}
              onSubmit={(amount) => run(() => updateChargeAction(selected.charge.id, amount))}
            />
          ) : mode === "void" ? (
            <ReasonForm
              question={t("voidQuestion")}
              confirmLabel={t("voidConfirm")}
              pendingLabel={t("voiding")}
              pending={pending}
              error={error}
              onBack={() => setMode("detail")}
              onConfirm={(reason) => run(() => voidChargeAction(selected.charge.id, reason))}
            />
          ) : (
            <div className="grid gap-4">
              <dl className="grid gap-3 rounded-card border border-border bg-surface p-4 tabular-nums">
                <div className="flex justify-between gap-3">
                  <dt className="text-fg-muted">{t("chargeDetail.date")}</dt>
                  <dd>
                    {f.date(selected.charge.charged_at)}, {f.time(selected.charge.charged_at)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-fg-muted">{t("chargeDetail.amount")}</dt>
                  <dd className={cn(selected.charge.voided_at && "line-through")}>
                    {f.price(selected.charge.amount_cop)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-fg-muted">
                    {t("chargeDetail.forBarber", {
                      pct: formatPercent(Number(selected.charge.barber_pct), f.locale),
                    })}
                  </dt>
                  <dd>{f.price(selected.charge.barber_amount_cop ?? 0)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-fg-muted">{t("chargeDetail.forBusiness")}</dt>
                  <dd>{f.price(selected.charge.business_amount_cop ?? 0)}</dd>
                </div>
              </dl>
              {selected.charge.voided_at ? (
                <p className="text-body text-fg-muted">
                  {t("voided", { reason: selected.charge.void_reason ?? "" })}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {canCorrect(selected.charge) ? (
                    <Button variant="secondary" onClick={() => setMode("correct")}>
                      {t("correct")}
                    </Button>
                  ) : (
                    <p className="col-span-2 text-caption text-fg-muted">
                      {t("chargeDetail.sameDayOnly")}
                    </p>
                  )}
                  {isAdmin ? (
                    <Button
                      variant="secondary"
                      className="text-danger"
                      onClick={() => setMode("void")}
                    >
                      {t("sheet.void")}
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          )
        ) : null}
      </Sheet>
    </>
  );
}
