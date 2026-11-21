import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { oklch, wcagContrast } from "culori";
import { describe, expect, it } from "vitest";
import { colors, type ColorToken } from "./tokens";

const read = (relative: string) =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

/** `--nombre: #hex;` del bloque :root de styles.css. */
function cssTokens(): Record<string, string> {
  const css = read("../styles.css");
  const out: Record<string, string> = {};
  for (const m of css.matchAll(/^\s*--([a-z0-9-]+):\s*(#[0-9a-f]{6});/gim)) {
    out[m[1]!] = m[2]!.toUpperCase();
  }
  return out;
}

/** Filas `| `--nombre` | `#HEX` | ...` de la tabla de color de docs/11. */
function docTokens(): Record<string, string> {
  const md = read("../../../../docs/11-interfaz.md");
  const out: Record<string, string> = {};
  for (const m of md.matchAll(/^\| `--([a-z0-9-]+)` \| `(#[0-9A-Fa-f]{6})` \|/gm)) {
    out[m[1]!] = m[2]!.toUpperCase();
  }
  return out;
}

const ratio = (a: ColorToken, b: ColorToken) => wcagContrast(colors[a], colors[b]);

describe("tokens de color", () => {
  it("styles.css y tokens.ts tienen los mismos valores", () => {
    const css = cssTokens();
    for (const [name, value] of Object.entries(colors)) {
      expect(css[name], `--${name}`).toBe(value);
    }
  });

  it("coinciden con la tabla de docs/11", () => {
    const doc = docTokens();
    expect(Object.keys(doc).sort()).toEqual(Object.keys(colors).sort());
    for (const [name, value] of Object.entries(colors)) {
      expect(doc[name], `--${name}`).toBe(value);
    }
  });
});

/*
 * Contraste WCAG 2.2 calculado con culori (wcagContrast). Cubre las combinaciones que usan los
 * componentes; axe-core revisa además el texto ya pintado en la página de muestras.
 */
describe("contrastes", () => {
  const surfaces: ColorToken[] = ["bg", "surface", "surface-2"];

  it.each(
    (
      ["fg", "fg-muted", "fg-subtle", "brand", "success", "warning", "danger"] as ColorToken[]
    ).flatMap((text) => surfaces.map((surface) => [text, surface] as const)),
  )("texto %s sobre %s cumple 4,5:1", (text, surface) => {
    expect(ratio(text, surface)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ["accent-fg", "accent"],
    ["accent-fg", "accent-pressed"],
    ["accent-fg", "danger"],
    ["bg", "fg"],
  ] as const)("texto %s sobre el relleno %s cumple 4,5:1", (text, fill) => {
    expect(ratio(text, fill)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(
    (["border-strong", "accent", "fg"] as ColorToken[]).flatMap((edge) =>
      surfaces.map((surface) => [edge, surface] as const),
    ),
  )("borde o foco %s sobre %s cumple 3:1", (edge, surface) => {
    expect(ratio(edge, surface)).toBeGreaterThanOrEqual(3);
  });

  it.each((["bg", "surface", "surface-2"] as ColorToken[]).map((s) => [s] as const))(
    "borde --accent-muted sobre %s cumple 3:1",
    (surface) => {
      expect(ratio("accent-muted", surface)).toBeGreaterThanOrEqual(3);
    },
  );

  it("--border es decorativo y no se usa como única frontera de un control", () => {
    expect(ratio("border", "bg")).toBeLessThan(3);
  });
});

/*
 * Que las capas se distingan (docs/11, "Color", 20/11/2026): con la escala anterior la tarjeta y el
 * fondo quedaban a 1,08:1 y la pantalla se veía plana. Si alguien oscurece un tono, esto falla.
 */
describe("separación entre capas", () => {
  it.each([
    ["surface", "bg"],
    ["surface-2", "surface"],
  ] as const)("%s se separa de %s", (upper, lower) => {
    expect(ratio(upper, lower)).toBeGreaterThanOrEqual(1.1);
  });

  it("el borde se nota sobre la tarjeta", () => {
    expect(ratio("border", "surface")).toBeGreaterThanOrEqual(1.3);
  });
});

/*
 * Matices del amarillo (docs/11, "Color", 20/11/2026). El neón es un amarillo verdoso: oscurecido
 * con el mismo tono se ve oliva, que fue la primera prueba. El tono oscuro gira hacia lo cálido,
 * pero sin llegar al ámbar de --warning, que significa "Pendiente de aprobación".
 */
describe("matices del amarillo", () => {
  const hue = (token: ColorToken) => oklch(colors[token])!.h!;

  it("--accent-muted es más cálido que el neón", () => {
    expect(hue("accent-muted")).toBeLessThan(hue("accent"));
  });

  it("--accent-muted no se confunde con --warning", () => {
    expect(hue("accent-muted") - hue("warning")).toBeGreaterThanOrEqual(20);
  });
});
