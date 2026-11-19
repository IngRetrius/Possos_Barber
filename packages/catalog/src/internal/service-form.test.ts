import { describe, expect, it } from "vitest";
import { parsePesos, validateService } from "./service-form";

describe("parsePesos", () => {
  it("lee pesos con o sin puntos", () => {
    expect(parsePesos("30.000")).toBe(30000);
    expect(parsePesos("$ 30.000")).toBe(30000);
    expect(parsePesos("30000")).toBe(30000);
    expect(parsePesos("")).toBeNull();
    expect(parsePesos("30,5")).toBeNaN();
    expect(parsePesos("3.00")).toBeNaN();
  });
});

describe("validateService", () => {
  it("deja el precio en null si está vacío ([PENDIENTE])", () => {
    expect(
      validateService({ name: "Corte normal", description: "", durationMin: "60", priceCop: "" }),
    ).toEqual({
      ok: true,
      data: { name: "Corte normal", description: null, duration_min: 60, price_cop: null },
    });
  });

  it("pide duración en múltiplos de 5", () => {
    const result = validateService({
      name: "Barba",
      description: "",
      durationMin: "33",
      priceCop: "",
    });
    expect(result.ok).toBe(false);
  });
});
