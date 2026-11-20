import { Languages } from "lucide-react";
import { getLocale } from "next-intl/server";
import { cn } from "@possos/ui";
import { setLocale } from "./locale-actions";

/** Lo que dice el botón y cómo se llama cada idioma en su propio idioma. */
const OTHER = {
  es: { locale: "en", short: "EN", name: "English" },
  en: { locale: "es", short: "ES", name: "Español" },
} as const;

interface LocaleSwitchProps {
  className?: string;
  /**
   * `compact` ("EN") va en la esquina superior derecha de cada pantalla. `full` ("English" con el
   * ícono de idiomas) va en el pie del inicio, donde hay espacio y no carga el encabezado.
   */
  variant?: "compact" | "full";
}

/**
 * Botón ES/EN (docs/11, "Idiomas"). Muestra el idioma al que cambia, escrito en ese idioma ("EN"
 * o "English" en español, "ES" o "Español" en inglés) y con su `lang`, para que el lector de
 * pantalla lo pronuncie bien. Es un formulario: funciona sin JavaScript.
 */
export async function LocaleSwitch({ className, variant = "compact" }: LocaleSwitchProps) {
  const other = OTHER[(await getLocale()) as keyof typeof OTHER] ?? OTHER.es;
  return (
    <form action={setLocale} className={cn("shrink-0", className)}>
      <input type="hidden" name="locale" value={other.locale} />
      <button
        type="submit"
        lang={other.locale}
        data-slot="locale-switch"
        className={cn(
          "inline-flex h-12 min-w-11 cursor-pointer items-center justify-center rounded-card px-2 text-label text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg active:bg-surface-2",
          variant === "full" && "gap-2",
        )}
      >
        {variant === "full" ? (
          <>
            <Languages aria-hidden="true" strokeWidth={1.5} className="size-5" />
            {other.name}
          </>
        ) : (
          <>
            <span aria-hidden="true">{other.short}</span>
            <span className="sr-only">{other.name}</span>
          </>
        )}
      </button>
    </form>
  );
}
