import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  HTML_LANG,
  LOCALE,
  negotiateLocale,
  parseLocale,
  TIMEZONE,
} from "./constants";

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

  it("usa español de Colombia por omisión", () => {
    expect(DEFAULT_LOCALE).toBe("es");
    expect(LOCALE).toBe("es-CO");
    expect(HTML_LANG.en).toBe("en");
  });

  it("acepta solo los idiomas de la interfaz", () => {
    expect(parseLocale("en")).toBe("en");
    expect(parseLocale("es")).toBe("es");
    expect(parseLocale("fr")).toBe("es");
    expect(parseLocale(undefined)).toBe("es");
  });

  it("toma el idioma del dispositivo del encabezado Accept-Language", () => {
    expect(negotiateLocale("en-US,en;q=0.9")).toBe("en");
    expect(negotiateLocale("es-CO,es;q=0.9,en;q=0.8")).toBe("es");
    expect(negotiateLocale("en-GB")).toBe("en");
    expect(negotiateLocale("es-MX")).toBe("es");
    // Gana el primero que tenga la interfaz, en el orden de preferencia.
    expect(negotiateLocale("fr-FR,fr;q=0.9,en;q=0.8,es;q=0.7")).toBe("en");
    expect(negotiateLocale("es;q=0.5,en;q=0.9")).toBe("en");
    expect(negotiateLocale("EN-us")).toBe("en");
    // q=0 quiere decir "no lo quiero".
    expect(negotiateLocale("en;q=0,fr")).toBe("es");
    // Sin idioma conocido o sin encabezado: español.
    expect(negotiateLocale("fr-FR,de;q=0.8")).toBe("es");
    expect(negotiateLocale("*")).toBe("es");
    expect(negotiateLocale("")).toBe("es");
    expect(negotiateLocale(null)).toBe("es");
  });
});
