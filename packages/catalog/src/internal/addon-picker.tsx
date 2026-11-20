"use client";

import { Check, Plus } from "lucide-react";
import Form from "next/form";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Button, cn, formatDuration, useFormat } from "@possos/ui";
import type { ServiceAddon } from "../index";
import { withAddons } from "./addons";
import { servicePriceLabel } from "./price";

export interface AddonPickerProps {
  /** Ruta a la que va el formulario (GET). */
  action: string;
  /** Parámetros que se mantienen al enviar (servicio, barbero). */
  hidden: Record<string, string>;
  /** Nombre del parámetro de la URL con cada adicional elegido (lo define el flujo de reserva). */
  name: string;
  service: { price_cop: number | null; duration_min: number };
  addons: Pick<ServiceAddon, "id" | "name" | "price_cop" | "duration_min">[];
  /** Ids elegidos al cargar (los de la URL, ya filtrados). */
  selected: string[];
  /**
   * `refresh`: cada cambio vuelve a pedir la misma página (inicio: las horas cambian con la
   * duración). Sin JavaScript, un botón lo hace. `continue`: el botón `submitLabel` sigue al
   * paso siguiente con lo elegido.
   */
  mode: "refresh" | "continue";
  submitLabel?: string;
  className?: string;
}

/**
 * "Agrega": los adicionales de un servicio como chips que se marcan y desmarcan (barba, cejas,
 * diseño), con el total que cambia al instante. Cada chip es una casilla nativa dentro de un
 * `fieldset`: el lector de pantalla anuncia "marcada" y se usa con el teclado. El total se anuncia
 * completo ("Total $45.000, 2 h"), no solo la cifra. Es un formulario GET: funciona sin
 * JavaScript, y con JavaScript `next/form` navega sin recargar ni mover el scroll.
 */
export function AddonPicker({
  action,
  hidden,
  name,
  service,
  addons,
  selected,
  mode,
  submitLabel,
  className,
}: AddonPickerProps) {
  const t = useTranslations("catalog.addonPicker");
  const { locale } = useFormat();
  const formRef = useRef<HTMLFormElement>(null);
  const [checked, setChecked] = useState(() => new Set(selected));
  const total = withAddons(
    service,
    addons.filter((a) => checked.has(a.id)),
  );

  const toggle = (id: string, on: boolean) => {
    setChecked((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
    // Inicio: las horas libres dependen de la duración, así que se piden de nuevo.
    if (mode === "refresh") queueMicrotask(() => formRef.current?.requestSubmit());
  };

  const extra = (addon: AddonPickerProps["addons"][number]) => {
    const parts = [`+${servicePriceLabel(addon.price_cop, locale)}`];
    if (addon.duration_min > 0) parts.push(`+${formatDuration(addon.duration_min)}`);
    return parts.join(" · ");
  };

  return (
    <Form
      ref={formRef}
      action={action}
      replace={mode === "refresh"}
      scroll={false}
      className={cn("grid gap-3", className)}
    >
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {/* "Agrega" y el total van en un panel un tono más claro: se leen como una sola zona,
          aparte de las horas (docs/11, 20/11/2026). */}
      <div data-slot="addon-panel" className="grid gap-3 rounded-card bg-surface-2 p-3">
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-caption text-fg-muted">{t("legend")}</legend>
          <div className="flex flex-wrap gap-2">
            {addons.map((addon) => {
              const on = checked.has(addon.id);
              return (
                <label
                  key={addon.id}
                  data-slot="addon-chip"
                  className={cn(
                    "inline-flex min-h-12 cursor-pointer items-center gap-1.5 rounded-pill border px-3.5 text-label transition-colors",
                    "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                    on
                      ? "border-fg bg-fg text-bg"
                      : "border-border-strong text-fg hover:border-fg-muted active:border-fg-muted",
                  )}
                >
                  <input
                    type="checkbox"
                    name={name}
                    value={addon.id}
                    checked={on}
                    onChange={(event) => toggle(addon.id, event.currentTarget.checked)}
                    className="sr-only"
                  />
                  {on ? (
                    <Check aria-hidden="true" strokeWidth={2} className="size-4 shrink-0" />
                  ) : (
                    <Plus aria-hidden="true" strokeWidth={1.5} className="size-4 shrink-0" />
                  )}
                  <span>{addon.name}</span>
                  <span
                    className={cn("text-caption tabular-nums", on ? "text-bg" : "text-fg-muted")}
                  >
                    {extra(addon)}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <p
          role="status"
          aria-atomic="true"
          className="flex items-baseline justify-between gap-4 border-t border-border pt-3 text-body"
        >
          <span className="text-fg-muted">{t("total")}</span>
          <span className="text-label tabular-nums">
            <span className="font-semibold">{servicePriceLabel(total.priceCop, locale)}</span>
            <span className="sr-only">, </span>
            <span className="text-fg-muted"> · {formatDuration(total.durationMin)}</span>
          </span>
        </p>
      </div>
      {mode === "continue" ? (
        <Button type="submit" className="w-full">
          {submitLabel}
        </Button>
      ) : (
        // Sin JavaScript nadie envía el formulario al marcar: este botón lo hace.
        <Button
          type="submit"
          variant="secondary"
          className="w-full [@media(scripting:enabled)]:hidden"
        >
          {t("update")}
        </Button>
      )}
    </Form>
  );
}
