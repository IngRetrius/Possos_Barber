import { getLocale } from "next-intl/server";
import { cn } from "@possos/ui";
import { setLocale } from "./locale-actions";

/** Lo que dice el botón y cómo se llama cada idioma en su propio idioma. */
const OTHER = {
  es: { locale: "en", short: "EN", name: "English" },
  en: { locale: "es", short: "ES", name: "Español" },
} as const;

/**
 * Botón ES/EN de la esquina superior derecha (docs/11, "Idiomas"). Muestra el idioma al que
 * cambia, escrito en ese idioma ("EN" en español, "ES" en inglés) y con su `lang`, para que el
 * lector de pantalla lo pronuncie bien. Es un formulario: funciona sin JavaScript.
 */
export async function LocaleSwitch({ className }: { className?: string }) {
  const other = OTHER[(await getLocale()) as keyof typeof OTHER] ?? OTHER.es;
  return (
    <form action={setLocale} className={cn("shrink-0", className)}>
      <input type="hidden" name="locale" value={other.locale} />
      <button
        type="submit"
        lang={other.locale}
        data-slot="locale-switch"
        className="inline-flex h-12 min-w-11 cursor-pointer items-center justify-center rounded-card px-2 text-label text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg active:bg-surface-2"
      >
        <span aria-hidden="true">{other.short}</span>
        <span className="sr-only">{other.name}</span>
      </button>
    </form>
  );
}
