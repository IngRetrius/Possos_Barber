"use client";

import { useTranslations } from "next-intl";
import type { ReminderSummary } from "@possos/notifications";
import { StatusBadge, useFormat, type StatusTone } from "@possos/ui";

const TONES: Record<NonNullable<ReminderSummary["last"]>["state"], StatusTone> = {
  sending: "neutral",
  sent: "neutral",
  delivered: "success",
  read: "success",
  failed: "danger",
};

/**
 * El WhatsApp de una cita en su hoja (docs/11, "Detalle de una cita"): el último mensaje con su
 * estado ("Recordatorio entregado", "El recordatorio falló: revisa el número") y el próximo. El
 * estado lleva texto y punto, no solo color. Sin mensajes (el cliente no aceptó WhatsApp, o Meta
 * todavía no está conectado), no se muestra.
 */
export function ReminderStatus({ summary }: { summary: ReminderSummary | null }) {
  const t = useTranslations("web.agenda.reminder");
  const f = useFormat();
  if (!summary) return null;
  const { last, next } = summary;
  const when = (iso: string) => `${f.date(iso)}, ${f.time(iso)}`;

  return (
    <section
      aria-label={t("title")}
      className="grid gap-1.5 rounded-card border border-border bg-surface p-4"
    >
      <h3 className="text-caption text-fg-muted">{t("title")}</h3>
      {last ? (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <StatusBadge tone={TONES[last.state]}>
            {t(last.state === "failed" && last.phoneProblem ? "failedPhone" : last.state, {
              kind: last.kind,
            })}
          </StatusBadge>
          {last.at ? (
            <span className="text-caption text-fg-muted tabular-nums">
              {t("at", { when: when(last.at) })}
            </span>
          ) : null}
        </div>
      ) : null}
      {next ? (
        <p className="text-caption text-fg-muted tabular-nums">
          {t("next", { kind: next.kind, when: when(next.at) })}
        </p>
      ) : null}
    </section>
  );
}
