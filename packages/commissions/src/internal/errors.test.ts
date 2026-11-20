import { describe, expect, it } from "vitest";
import { COMMISSIONS_ERROR_CODES, commissionsErrorMessage } from "./errors";

describe("commissionsErrorMessage", () => {
  it("tiene un texto para cada código y para UNKNOWN", () => {
    for (const code of [...COMMISSIONS_ERROR_CODES, "UNKNOWN"] as const) {
      expect(commissionsErrorMessage(code)).toMatch(/\S/);
    }
  });

  it("nunca habla de facturas", () => {
    for (const code of [...COMMISSIONS_ERROR_CODES, "UNKNOWN"] as const) {
      expect(commissionsErrorMessage(code).toLowerCase()).not.toContain("factura");
      expect(commissionsErrorMessage(code, "en").toLowerCase()).not.toContain("invoice");
    }
  });
});
