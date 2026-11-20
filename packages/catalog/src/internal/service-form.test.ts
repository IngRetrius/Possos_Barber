import { describe, expect, it } from "vitest";
import { validateAddon } from "./addon-form";
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
      validateService({
        name: "Corte normal",
        description: "",
        durationMin: "60",
        priceCop: "",
        category: "",
      }),
    ).toEqual({
      ok: true,
      data: {
        name: "Corte normal",
        description: null,
        duration_min: 60,
        price_cop: null,
        category: null,
      },
    });
  });

  it("pide duración en múltiplos de 5", () => {
    const result = validateService({
      name: "Barba",
      description: "",
      durationMin: "33",
      priceCop: "",
      category: "",
    });
    expect(result).toEqual({ ok: false, errors: { durationMin: "durationInvalid" } });
  });
});

describe("categoría del servicio", () => {
  it("guarda el grupo sin espacios de más", () => {
    const result = validateService({
      name: "Rayos platinados",
      description: "",
      durationMin: "240",
      priceCop: "120.000",
      category: "  Color   de cabello ",
    });
    expect(result.ok && result.data.category).toBe("Color de cabello");
  });
});

describe("validateAddon", () => {
  it("acepta un adicional sin minutos extra y deja el precio vacío en null", () => {
    expect(validateAddon({ name: " Cejas ", durationMin: "", priceCop: "" })).toEqual({
      ok: true,
      data: { name: "Cejas", duration_min: 0, price_cop: null },
    });
    expect(validateAddon({ name: "Barba", durationMin: "60", priceCop: "15.000" })).toEqual({
      ok: true,
      data: { name: "Barba", duration_min: 60, price_cop: 15000 },
    });
  });

  it("pide nombre, minutos en múltiplos de 5 y pesos enteros", () => {
    expect(validateAddon({ name: "", durationMin: "7", priceCop: "5,5" })).toEqual({
      ok: false,
      errors: { name: "nameRequired", durationMin: "durationInvalid", priceCop: "priceInvalid" },
    });
  });
});
