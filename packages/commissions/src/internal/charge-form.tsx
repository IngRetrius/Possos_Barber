"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Button, cn, InlineError, useFormat } from "@possos/ui";
import { formatPercent, splitAmount } from "./split";

export interface ChargeFormProps {
  /** Valor prellenado: el precio de la cita o el cobro que se corrige. Null si no hay precio. */
  defaultAmount: number | null;
  /** Porcentaje del barbero, o null si no está definido (la base no deja cobrar). */
  barberPct: number | null;
  /** "Para ti" si quien cobra es el barbero; "Para el barbero" si es el administrador. */
  barberLabel: string;
  submitLabel: string;
  pendingLabel: string;
  pending: boolean;
  error?: string | null;
  onSubmit: (amountCop: number) => void;
  onCancel?: () => void;
}

/** Solo dígitos: "$ 30.000" → 30000. */
function digits(value: string): string {
  return value
    .replace(/\D/g, "")
    .replace(/^0+(?=\d)/, "")
    .slice(0, 9);
}

/**
 * Cobro al marcar "Vino" y corrección del valor (docs/11): valor prellenado y editable, y el
 * reparto entre el barbero y la barbería recalculado mientras se escribe, con cifras tabulares.
 * En la interfaz es un cobro, nunca una "factura" (no es factura electrónica de la DIAN).
 */
export function ChargeForm({
  defaultAmount,
  barberPct,
  barberLabel,
  submitLabel,
  pendingLabel,
  pending,
  error,
  onSubmit,
  onCancel,
}: ChargeFormProps) {
  const t = useTranslations("commissions.chargeForm");
  const f = useFormat();
  const id = useId();
  const [value, setValue] = useState(defaultAmount === null ? "" : String(defaultAmount));
  const [missing, setMissing] = useState(false);
  const amount = value === "" ? null : Number(value);
  const split = amount !== null && barberPct !== null ? splitAmount(amount, barberPct) : null;

  return (
    <form
      className="grid gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (amount === null) {
          setMissing(true);
          return;
        }
        onSubmit(amount);
      }}
    >
      <div className="grid gap-2">
        <label htmlFor={id} className="text-label">
          {t("amount")}
        </label>
        <div
          className={cn(
            "flex h-12 items-stretch overflow-hidden rounded-card border border-border-strong bg-surface",
            "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
            missing && "border-danger",
          )}
        >
          <span aria-hidden="true" className="flex items-center pl-4 text-body text-fg-muted">
            $
          </span>
          <input
            id={id}
            name="valor"
            inputMode="numeric"
            autoComplete="off"
            value={value === "" ? "" : f.price(Number(value)).replace(/^\$\s?/, "")}
            onChange={(e) => {
              setValue(digits(e.target.value));
              setMissing(false);
            }}
            aria-invalid={missing || undefined}
            aria-describedby={`${id}-split`}
            className="min-w-0 flex-1 bg-transparent px-2 text-body text-fg tabular-nums outline-none"
          />
        </div>
        {missing ? <p className="text-caption text-danger">{t("amountRequired")}</p> : null}
        {defaultAmount === null ? (
          <p className="text-caption text-fg-muted">{t("noPrice")}</p>
        ) : null}
      </div>
      <dl
        id={`${id}-split`}
        aria-live="polite"
        className="grid gap-2 rounded-card border border-border bg-surface p-4 text-body tabular-nums"
      >
        <div className="flex justify-between gap-3">
          <dt className="text-fg-muted">
            {barberLabel}
            {barberPct !== null ? ` (${formatPercent(barberPct, f.locale)})` : ""}
          </dt>
          <dd>{split ? f.price(split.barber) : "-"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-fg-muted">
            {t("business")}
            {barberPct !== null ? ` (${formatPercent(100 - barberPct, f.locale)})` : ""}
          </dt>
          <dd>{split ? f.price(split.business) : "-"}</dd>
        </div>
      </dl>
      {barberPct === null ? <InlineError>{t("noRate")}</InlineError> : null}
      {error ? <InlineError>{error}</InlineError> : null}
      <div className="grid gap-2">
        <Button type="submit" disabled={pending || barberPct === null} aria-busy={pending}>
          {pending ? pendingLabel : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t("back")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
