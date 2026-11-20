import { describe, expect, it } from "vitest";
import { formatPercent, periodRange, splitAmount } from "./split";

describe("splitAmount", () => {
  it("reparte al peso y siempre suma lo cobrado", () => {
    expect(splitAmount(30000, 50)).toEqual({ barber: 15000, business: 15000 });
    expect(splitAmount(25001, 50)).toEqual({ barber: 12501, business: 12500 });
    expect(splitAmount(10000, 33.33)).toEqual({ barber: 3333, business: 6667 });
    for (const amount of [0, 1, 999, 35500, 123457]) {
      const { barber, business } = splitAmount(amount, 45.5);
      expect(barber + business).toBe(amount);
    }
  });
});

describe("formatPercent", () => {
  it("usa coma decimal", () => {
    expect(formatPercent(50)).toBe("50 %");
    expect(formatPercent(45.5)).toBe("45,5 %");
  });
});

describe("periodRange", () => {
  it("calcula hoy, la semana, la quincena y el mes", () => {
    expect(periodRange("hoy", "2026-11-19")).toEqual({ from: "2026-11-19", to: "2026-11-19" });
    expect(periodRange("semana", "2026-11-19")).toEqual({ from: "2026-11-16", to: "2026-11-22" });
    expect(periodRange("semana", "2026-11-22")).toEqual({ from: "2026-11-16", to: "2026-11-22" });
    expect(periodRange("quincena", "2026-11-15")).toEqual({ from: "2026-11-01", to: "2026-11-15" });
    expect(periodRange("quincena", "2026-11-16")).toEqual({ from: "2026-11-16", to: "2026-11-30" });
    expect(periodRange("mes", "2027-02-10")).toEqual({ from: "2027-02-01", to: "2027-02-28" });
  });
});
