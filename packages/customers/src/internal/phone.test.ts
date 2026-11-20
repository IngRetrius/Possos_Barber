import { describe, expect, it } from "vitest";
import {
  formatPhone,
  normalizePhoneDigits,
  parseColombianMobile,
  phoneErrorMessage,
} from "./phone";

describe("parseColombianMobile", () => {
  it.each([
    ["3001234567"],
    ["300 123 4567"],
    ["300-123-4567"],
    ["(300) 123 4567"],
    ["+57 300 123 4567"],
    ["+573001234567"],
    ["57 3001234567"],
    [" 3001234567 "],
  ])("acepta %j como +573001234567", (value) => {
    expect(parseColombianMobile(value)).toEqual({
      ok: true,
      e164: "+573001234567",
      national: "3001234567",
    });
  });

  it.each([
    ["", "EMPTY"],
    ["   ", "EMPTY"],
    ["+57", "LENGTH"],
    ["300123456", "LENGTH"],
    ["30012345678", "LENGTH"],
    ["573001234", "LENGTH"],
    ["+1 300 123 4567", "LENGTH"],
    ["6012345678", "NOT_MOBILE"],
    ["+57 601 234 5678", "NOT_MOBILE"],
    ["1234567890", "NOT_MOBILE"],
  ] as const)("rechaza %j (%s)", (value, error) => {
    expect(parseColombianMobile(value)).toEqual({ ok: false, error });
  });

  it("produce lo que acepta la restricción de la base (+57 y 10 dígitos)", () => {
    const parsed = parseColombianMobile("315 987 6543");
    expect(parsed.ok && parsed.e164).toMatch(/^\+57[0-9]{10}$/);
  });

  it("tiene un mensaje claro para cada error", () => {
    expect(phoneErrorMessage("EMPTY")).toBe("Escribe tu celular");
    expect(phoneErrorMessage("LENGTH")).toBe("El celular debe tener 10 dígitos, sin el +57");
    expect(phoneErrorMessage("NOT_MOBILE")).toBe(
      "Escribe un número de celular: en Colombia empiezan por 3",
    );
    expect(phoneErrorMessage("EMPTY", "en")).toBe("Enter your mobile number");
  });
});

describe("normalizePhoneDigits", () => {
  it.each([
    ["300 123 4567", "3001234567"],
    ["+57 300 123 4567", "3001234567"],
    ["573001234567", "3001234567"],
    ["300123456789", "3001234567"],
    ["30a0", "300"],
    ["57", "57"],
    ["", ""],
  ])("%j → %j", (value, expected) => {
    expect(normalizePhoneDigits(value)).toBe(expected);
  });
});

describe("formatPhone", () => {
  it("separa el celular en grupos", () => {
    expect(formatPhone("+573001234567")).toBe("300 123 4567");
  });

  it("deja igual lo que no reconoce", () => {
    expect(formatPhone("+15551234567")).toBe("+15551234567");
    expect(formatPhone(null)).toBe("");
  });
});
