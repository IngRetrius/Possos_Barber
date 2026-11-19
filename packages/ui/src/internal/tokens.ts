/* eslint-disable possos/no-raw-color -- Este archivo y styles.css son los únicos con valores de color. */

/**
 * Colores de docs/11-interfaz.md#color. Son los mismos de `styles.css`; una prueba lo verifica.
 * Úsalos solo donde no llega el CSS (por ejemplo, `themeColor` del viewport o el manifiesto de la PWA).
 * En los componentes se usan las clases de Tailwind (`bg-surface`, `text-fg-muted`...).
 */
export const colors = {
  bg: "#0B0B0B",
  surface: "#151515",
  "surface-2": "#1F1F1F",
  border: "#262626",
  "border-strong": "#6B6B6B",
  fg: "#F5F5F5",
  "fg-muted": "#A1A1A1",
  "fg-subtle": "#8A8A8A",
  brand: "#BCBCBC",
  accent: "#F2F824",
  "accent-fg": "#0B0B0B",
  success: "#00F818",
  warning: "#F5A524",
  danger: "#FF6B6B",
} as const;

export type ColorToken = keyof typeof colors;
