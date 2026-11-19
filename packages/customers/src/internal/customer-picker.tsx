"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button, Checkbox, cn, Field, Input, PhoneInput } from "@possos/ui";
import { formatPhone, normalizePhoneDigits } from "./phone";
import { MAX_NAME_LENGTH } from "./profile";
import type { StaffCustomerErrors } from "./staff";

export interface PickerCustomer {
  id: string;
  full_name: string;
  phone: string | null;
}

export interface CustomerPickerProps {
  /** Busca entre los clientes que la sesión ve (Server Action). */
  search: (query: string) => Promise<PickerCustomer[]>;
  /** Los más recientes, para mostrar antes de escribir. */
  initialResults: PickerCustomer[];
  /** Errores del cliente nuevo que devolvió la acción. */
  errors?: StaffCustomerErrors & { customer?: string };
  /** Cliente ya elegido (por ejemplo, desde su ficha). */
  initialCustomer?: PickerCustomer | null;
  /** Enlace a la política de tratamiento de datos. */
  policyHref: string;
}

const SEARCH_DELAY_MS = 250;

/**
 * Cliente de una cita creada por el personal (docs/11, "Nueva cita"): buscar por nombre o
 * celular, o "Cliente nuevo" con nombre, celular y la autorización que dio de palabra (Ley 1581).
 * Va dentro del `<form>` de la cita: envía `modo` (`buscar` o `nuevo`), `cliente` o los campos
 * `nuevo_*`.
 */
export function CustomerPicker({
  search,
  initialResults,
  errors,
  initialCustomer = null,
  policyHref,
}: CustomerPickerProps) {
  const groupId = useId();
  const [mode, setMode] = useState<"buscar" | "nuevo">(
    errors?.fullName || errors?.phone || errors?.dataConsent ? "nuevo" : "buscar",
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(initialResults);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<PickerCustomer | null>(initialCustomer);
  const [phone, setPhone] = useState("");
  const latest = useRef(0);

  useEffect(() => {
    if (mode !== "buscar") return;
    const ticket = ++latest.current;
    const timer = setTimeout(
      async () => {
        setSearching(true);
        try {
          const found = await search(query);
          if (ticket === latest.current) setResults(found);
        } finally {
          if (ticket === latest.current) setSearching(false);
        }
      },
      query ? SEARCH_DELAY_MS : 0,
    );
    return () => clearTimeout(timer);
  }, [query, mode, search]);

  const options =
    selected && !results.some((r) => r.id === selected.id) ? [selected, ...results] : results;

  return (
    <fieldset className="grid gap-4">
      <legend className="mb-2 text-heading">Cliente</legend>
      <input type="hidden" name="modo" value={mode} />
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Cómo elegir el cliente">
        <Button
          type="button"
          variant={mode === "buscar" ? "secondary" : "ghost"}
          aria-pressed={mode === "buscar"}
          className={cn(mode === "buscar" && "border-fg")}
          onClick={() => setMode("buscar")}
        >
          Buscar
        </Button>
        <Button
          type="button"
          variant={mode === "nuevo" ? "secondary" : "ghost"}
          aria-pressed={mode === "nuevo"}
          className={cn(mode === "nuevo" && "border-fg")}
          onClick={() => setMode("nuevo")}
        >
          Cliente nuevo
        </Button>
      </div>

      {mode === "buscar" ? (
        <div key="buscar" className="grid gap-3">
          <Field label="Buscar por nombre o celular" error={errors?.customer}>
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
              enterKeyHint="search"
              onKeyDown={(e) => {
                if (e.key === "Enter") e.preventDefault();
              }}
            />
          </Field>
          <div aria-live="polite" className="text-caption text-fg-muted">
            {searching
              ? "Buscando..."
              : options.length === 0
                ? query
                  ? "No encontramos clientes con ese nombre o celular. Créalo como cliente nuevo."
                  : "Todavía no tienes clientes. Crea uno nuevo."
                : null}
          </div>
          {options.length > 0 ? (
            <div
              role="radiogroup"
              aria-label="Clientes"
              className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface"
            >
              {options.map((c) => {
                const id = `${groupId}-${c.id}`;
                return (
                  <label
                    key={c.id}
                    htmlFor={id}
                    className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-2 has-[:checked]:bg-surface-2"
                  >
                    <input
                      id={id}
                      type="radio"
                      name="cliente"
                      value={c.id}
                      checked={selected?.id === c.id}
                      onChange={() => setSelected(c)}
                      className="size-5 shrink-0 accent-fg"
                    />
                    <span className="grid min-w-0 flex-1">
                      <span className="truncate text-label">{c.full_name}</span>
                      {c.phone ? (
                        <span className="text-caption text-fg-muted tabular-nums">
                          {formatPhone(c.phone)}
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : (
        <div key="nuevo" className="grid gap-4">
          <Field label="Nombre" error={errors?.fullName}>
            <Input name="nuevo_nombre" autoComplete="off" maxLength={MAX_NAME_LENGTH} required />
          </Field>
          <Field
            label="Celular"
            hint="Para los recordatorios por WhatsApp. Ningún otro cliente lo ve."
            error={errors?.phone}
          >
            <PhoneInput
              name="nuevo_celular"
              value={phone}
              onChange={(e) => setPhone(normalizePhoneDigits(e.target.value))}
              required
            />
          </Field>
          <Checkbox name="nuevo_autoriza" value="si" error={errors?.dataConsent}>
            El cliente autorizó de palabra el tratamiento de sus datos para agendar sus citas, según
            la{" "}
            <a href={policyHref} target="_blank" className="underline underline-offset-4">
              política de tratamiento de datos
            </a>
            .
          </Checkbox>
          <Checkbox name="nuevo_whatsapp" value="si">
            Quiere recibir por WhatsApp la confirmación y los recordatorios de sus citas.
          </Checkbox>
        </div>
      )}
    </fieldset>
  );
}
