"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { selectBarberAction } from "../_actions/agenda";

/**
 * Selector del barbero cuya agenda se ve. Solo para el administrador con más de un barbero, o
 * sin agenda propia. La elección queda en una cookie (servidor) y la página se vuelve a pedir.
 */
export function BarberSwitcher({
  barbers,
  value,
}: {
  barbers: { id: string; name: string; active: boolean }[];
  value: string;
}) {
  const t = useTranslations("web.panel.switcher");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <label className="grid gap-1 px-gutter">
      <span className="text-caption text-fg-muted">{t("label")}</span>
      <select
        value={value}
        disabled={pending}
        aria-busy={pending}
        onChange={(e) => {
          const id = e.target.value;
          start(async () => {
            await selectBarberAction(id);
            router.refresh();
          });
        }}
        className="h-12 w-full rounded-card border border-border-strong bg-surface px-4 text-body text-fg"
      >
        {barbers.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
            {b.active ? "" : t("inactive")}
          </option>
        ))}
      </select>
    </label>
  );
}
