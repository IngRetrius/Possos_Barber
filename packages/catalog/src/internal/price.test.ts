import { describe, expect, it } from "vitest";
import { PENDING, servicePriceLabel } from "./price";

describe("servicePriceLabel", () => {
  it("sin precio dice [PENDIENTE]", () => {
    expect(servicePriceLabel(null)).toBe(PENDING);
  });

  it("con precio lo formatea en pesos", () => {
    expect(servicePriceLabel(30000)).toMatch(/30\.000/);
  });

  it("en inglés dice [PENDING] y usa coma de miles", () => {
    expect(servicePriceLabel(null, "en")).toBe("[PENDING]");
    expect(servicePriceLabel(30000, "en")).toBe("$30,000");
  });
});
