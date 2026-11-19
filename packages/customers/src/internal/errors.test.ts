import { describe, expect, it } from "vitest";
import { customersErrorCode, customersErrorMessage } from "./errors";

describe("customersErrorCode", () => {
  it.each([
    [
      { code: "23514", message: 'new row violates check constraint "customers_phone_check"' },
      "INVALID_CUSTOMER",
    ],
    [{ code: "42501", message: "new row violates row-level security policy" }, "FORBIDDEN"],
    [{ code: "23505", message: "duplicate key value" }, "FORBIDDEN"],
    [{ code: "P0001", message: "NOT_AUTHENTICATED" }, "NOT_AUTHENTICATED"],
    [{ code: "P0001", message: "INVALID_CUSTOMER" }, "INVALID_CUSTOMER"],
    [{ code: "XX000", message: "otra cosa" }, "UNKNOWN"],
    [null, "UNKNOWN"],
  ] as const)("%j es %s", (error, expected) => {
    expect(customersErrorCode(error)).toBe(expected);
  });

  it("usa el texto de docs/11 para INVALID_CUSTOMER", () => {
    expect(customersErrorMessage("INVALID_CUSTOMER")).toBe(
      "Revisa el nombre y el celular (+57 y 10 dígitos)",
    );
  });
});
