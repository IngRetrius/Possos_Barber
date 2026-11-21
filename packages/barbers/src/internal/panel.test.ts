import { describe, expect, it } from "vitest";
import { isOwnImagePath, newImagePath } from "./images";
import { normalizeWhatsappUrl, validateBarberProfile } from "./profile";
import { parseWeeklyRanges, validateWeeklyRanges } from "./weekly-hours";

const BARBER = "5eedba00-0000-0000-0000-000000000001";

describe("rutas de imágenes", () => {
  it("acepta solo la carpeta del barbero", () => {
    expect(isOwnImagePath(BARBER, newImagePath(BARBER, "abc-123"))).toBe(true);
    expect(isOwnImagePath(BARBER, "otro/abc.jpg")).toBe(false);
    expect(isOwnImagePath(BARBER, `${BARBER}/../otro/abc.jpg`)).toBe(false);
    expect(isOwnImagePath(BARBER, `${BARBER}/abc.svg`)).toBe(false);
  });
});

describe("horario semanal", () => {
  it("lee los rangos del formulario", () => {
    expect(parseWeeklyRanges(["1|09:00|12:00", "x|1|2", "2|14:00|19:00"])).toEqual([
      { weekday: 1, start_time: "09:00", end_time: "12:00" },
      { weekday: 2, start_time: "14:00", end_time: "19:00" },
    ]);
  });

  it("acepta rangos que se tocan y rechaza los que se cruzan", () => {
    const ok = parseWeeklyRanges(["1|09:00|12:00", "1|12:00|14:00"]);
    expect(validateWeeklyRanges(ok).size).toBe(0);
    const bad = parseWeeklyRanges(["1|09:00|12:00", "1|11:00|14:00"]);
    expect(validateWeeklyRanges(bad).get(1)).toBe("HOURS_OVERLAP");
  });

  it("rechaza un rango que termina antes de empezar", () => {
    expect(validateWeeklyRanges(parseWeeklyRanges(["3|12:00|09:00"])).get(3)).toBe("INVALID_RANGE");
  });
});

describe("perfil del barbero", () => {
  it("convierte el celular en enlace de WhatsApp", () => {
    expect(normalizeWhatsappUrl("300 123 4567")).toBe("https://wa.me/573001234567");
    expect(normalizeWhatsappUrl("+57 3001234567")).toBe("https://wa.me/573001234567");
    expect(normalizeWhatsappUrl("https://wa.me/573001234567")).toBe("https://wa.me/573001234567");
    expect(normalizeWhatsappUrl("")).toBeNull();
    expect(normalizeWhatsappUrl("http://wa.me/1")).toBeUndefined();
    expect(normalizeWhatsappUrl("https://ejemplo.com")).toBeUndefined();
  });

  it("el cargo es opcional, se recorta y tiene un máximo", () => {
    const base = {
      displayName: "Santiago Possos",
      bio: "",
      whatsappUrl: "",
      slotIntervalMin: "60",
    };
    const ok = validateBarberProfile({ ...base, jobTitle: "  CEO y barbero " });
    expect(ok.ok && ok.data.job_title).toBe("CEO y barbero");
    const empty = validateBarberProfile({ ...base, jobTitle: "   " });
    expect(empty.ok && empty.data.job_title).toBeNull();
    const long = validateBarberProfile({ ...base, jobTitle: "a".repeat(41) });
    expect(!long.ok && long.errors.jobTitle).toBe("jobTitleTooLong");
  });

  it("valida nombre e intervalo", () => {
    const result = validateBarberProfile({
      displayName: " ",
      jobTitle: "",
      bio: "",
      whatsappUrl: "",
      slotIntervalMin: "7",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.displayName).toBe("nameRequired");
      expect(result.errors.slotIntervalMin).toBeDefined();
    }
  });
});
