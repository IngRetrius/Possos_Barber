"use client";

import { Check } from "lucide-react";
import { createContext, useContext, useId, type ComponentProps, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "../cn";

/*
 * Todos los campos usan text-body (16 px) para que iOS no haga zoom al tocarlos.
 */

interface FieldContextValue {
  id: string;
  describedBy?: string;
  invalid: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

export interface FieldProps {
  label: string;
  /** Ayuda debajo del campo. */
  hint?: ReactNode;
  /** Mensaje de error; marca el campo como inválido. */
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Etiqueta, ayuda y error de un campo. El `Input`, `PhoneInput` o `Textarea` de adentro se conecta solo. */
export function Field({ label, hint, error, children, className }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  return (
    <FieldContext.Provider value={{ id, describedBy, invalid: Boolean(error) }}>
      <div data-slot="field" className={cn("grid gap-2", className)}>
        <label htmlFor={id} className="text-label">
          {label}
        </label>
        {children}
        {error ? (
          <p id={errorId} className="text-caption text-danger">
            {error}
          </p>
        ) : null}
        {hint ? (
          <p id={hintId} className="text-caption text-fg-muted">
            {hint}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}

function useFieldProps(props: {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: unknown;
}) {
  const field = useContext(FieldContext);
  return {
    id: props.id ?? field?.id,
    "aria-describedby":
      [props["aria-describedby"], field?.describedBy].filter(Boolean).join(" ") || undefined,
    "aria-invalid": (props["aria-invalid"] as boolean | undefined) ?? (field?.invalid || undefined),
  };
}

const control = cn(
  "w-full rounded-card border border-border-strong bg-surface px-4 text-body text-fg transition-colors",
  "placeholder:text-fg-subtle aria-invalid:border-danger disabled:opacity-50",
);

export function Input({ className, ...props }: ComponentProps<"input">) {
  const field = useFieldProps(props);
  return (
    <input data-slot="input" {...props} {...field} className={cn(control, "h-12", className)} />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  const field = useFieldProps(props);
  return (
    <textarea
      data-slot="textarea"
      rows={3}
      {...props}
      {...field}
      className={cn(control, "min-h-24 py-3", className)}
    />
  );
}

/**
 * Celular colombiano con el prefijo +57 fijo. Solo pide los 10 dígitos; la validación vive en
 * el módulo que guarda el número.
 */
export function PhoneInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  const t = useTranslations("ui.phone");
  const field = useFieldProps(props);
  const prefixId = useId();
  return (
    // Tocar el prefijo también enfoca el campo: el área táctil es la caja completa de 48 px.
    <div
      onMouseDown={(e) => {
        const input = e.currentTarget.querySelector("input");
        if (input && e.target !== input) {
          e.preventDefault();
          input.focus();
        }
      }}
      data-slot="phone-input"
      className={cn(
        "flex h-12 items-stretch overflow-hidden rounded-card border border-border-strong bg-surface transition-colors",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
        "has-[[aria-invalid=true]]:border-danger",
        className,
      )}
    >
      <span
        id={prefixId}
        className="flex items-center border-r border-border-strong px-3 text-body text-fg-muted tabular-nums"
      >
        <span className="sr-only">{t("prefix")} </span>+57
      </span>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        maxLength={10}
        {...props}
        {...field}
        aria-describedby={[prefixId, field["aria-describedby"]].filter(Boolean).join(" ")}
        className="min-w-0 flex-1 bg-transparent px-3 text-body text-fg tabular-nums outline-none placeholder:text-fg-subtle"
      />
    </div>
  );
}

export interface CheckboxProps extends Omit<ComponentProps<"input">, "type" | "children"> {
  /** Texto a la derecha de la casilla. */
  children: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
}

/**
 * Casilla con su texto. Nunca viene marcada por omisión en las autorizaciones (Ley 1581).
 * Marcada se ve blanca y no amarilla: el acento queda para la acción principal.
 */
export function Checkbox({ children, hint, error, className, id, ...props }: CheckboxProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  return (
    <div data-slot="checkbox" className={cn("grid gap-1", className)}>
      <label htmlFor={inputId} className="flex min-h-12 cursor-pointer items-start gap-3 py-3">
        <span className="relative mt-px flex size-6 shrink-0">
          <input
            id={inputId}
            type="checkbox"
            aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
            aria-invalid={error ? true : undefined}
            className={cn(
              "peer size-6 cursor-pointer appearance-none rounded-sm border border-border-strong bg-surface transition-colors",
              "checked:border-fg checked:bg-fg aria-invalid:border-danger disabled:opacity-50",
            )}
            {...props}
          />
          <Check
            aria-hidden="true"
            strokeWidth={2.5}
            className="pointer-events-none absolute inset-0.5 hidden size-5 text-bg peer-checked:block"
          />
        </span>
        <span className="text-body">{children}</span>
      </label>
      {error ? (
        <p id={errorId} className="pl-9 text-caption text-danger">
          {error}
        </p>
      ) : null}
      {hint ? (
        <p id={hintId} className="pl-9 text-caption text-fg-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
