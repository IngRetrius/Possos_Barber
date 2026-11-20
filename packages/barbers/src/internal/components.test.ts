import { describe, expect, it } from "vitest";
import { initials } from "./components";

describe("initials", () => {
  it.each([
    ["Santiago Possos", "SP"],
    ["santiago", "S"],
    ["  Ana María  López ", "AL"],
    ["Ñeco", "Ñ"],
  ])("%s da %s", (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});
