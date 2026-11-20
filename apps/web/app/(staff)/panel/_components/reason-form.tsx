"use client";

import { useState } from "react";
import { Button, Field, InlineError, Textarea } from "@possos/ui";

/** Confirmación con motivo obligatorio dentro de una hoja: cancelar una cita, anular un cobro. */
export function ReasonForm({
  question,
  confirmLabel,
  pendingLabel,
  backLabel = "Volver",
  pending,
  error,
  onBack,
  onConfirm,
}: {
  question: string;
  confirmLabel: string;
  pendingLabel: string;
  backLabel?: string;
  pending: boolean;
  error: string | null;
  onBack: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [missing, setMissing] = useState(false);
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!reason.trim()) {
          setMissing(true);
          return;
        }
        onConfirm(reason);
      }}
    >
      <p className="text-body">{question}</p>
      <Field label="Motivo" error={missing ? "Escribe el motivo" : undefined}>
        <Textarea
          name="motivo"
          value={reason}
          maxLength={200}
          onChange={(e) => {
            setReason(e.target.value);
            setMissing(false);
          }}
        />
      </Field>
      {error ? <InlineError>{error}</InlineError> : null}
      <div className="grid gap-2">
        <Button type="submit" variant="danger" disabled={pending} aria-busy={pending}>
          {pending ? pendingLabel : confirmLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onBack}>
          {backLabel}
        </Button>
      </div>
    </form>
  );
}
