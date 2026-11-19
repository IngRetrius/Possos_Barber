import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("no confunde la escala de texto con un color", () => {
    expect(cn("text-title", "text-fg")).toBe("text-title text-fg");
    expect(cn("text-caption", "text-label")).toBe("text-label");
  });

  it("resuelve choques de colores, radios y espacios propios", () => {
    expect(cn("bg-surface", "bg-accent")).toBe("bg-accent");
    expect(cn("rounded-card", "rounded-pill")).toBe("rounded-pill");
    expect(cn("px-4", "px-gutter")).toBe("px-gutter");
  });
});
