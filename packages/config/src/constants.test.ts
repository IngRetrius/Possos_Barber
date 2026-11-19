import { describe, expect, it } from "vitest";
import { LOCALE, TIMEZONE } from "./constants";

describe("constantes compartidas", () => {
  it("usa la zona horaria de Bogotá", () => {
    expect(TIMEZONE).toBe("America/Bogota");
    // Intl la reconoce y no tiene horario de verano: el desfase es -5 h todo el año.
    const offset = (iso: string) =>
      new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, timeZoneName: "longOffset" })
        .formatToParts(new Date(iso))
        .find((p) => p.type === "timeZoneName")?.value;
    expect(offset("2026-01-15T12:00:00Z")).toBe("GMT-05:00");
    expect(offset("2026-07-15T12:00:00Z")).toBe("GMT-05:00");
  });

  it("usa español de Colombia", () => {
    expect(LOCALE).toBe("es-CO");
  });
});
