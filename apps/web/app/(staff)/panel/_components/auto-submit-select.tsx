"use client";

import type { ReactNode } from "react";

/** Un `<select>` dentro de un formulario GET que se envía al cambiar (filtro de una lista). */
export function AutoSubmitSelect({
  name,
  label,
  defaultValue,
  children,
}: {
  name: string;
  label: string;
  defaultValue: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-caption text-fg-muted">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-12 w-full rounded-card border border-border-strong bg-surface px-4 text-body text-fg"
      >
        {children}
      </select>
    </label>
  );
}
