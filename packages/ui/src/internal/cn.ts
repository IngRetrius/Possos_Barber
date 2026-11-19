import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge no conoce la escala propia: sin esto trataría `text-title` como un color y lo
 * borraría al juntarlo con `text-fg`.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["title", "heading", "body", "label", "caption"],
      radius: ["sm", "card", "sheet", "pill"],
      spacing: ["gutter"],
    },
  },
});

/** Junta clases y resuelve los choques de Tailwind (la última gana). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
