import { describe, expect, it } from "vitest";
import { colombianHolidays, easterSunday, holidaysBetween } from "./holidays";

/*
 * Calendario oficial. Fuentes consultadas el 19/11/2026: festivos.com.co/2026 y /2027, y el
 * anuncio del Ministerio del Interior sobre la Ley 2578 de 2026 (9 de julio, Virgen de
 * Chiquinquirá, trasladable: en 2026 se descansa el lunes 13 de julio).
 */
const OFFICIAL_2026 = [
  "2026-01-01",
  "2026-01-12",
  "2026-03-23",
  "2026-04-02",
  "2026-04-03",
  "2026-05-01",
  "2026-05-18",
  "2026-06-08",
  "2026-06-15",
  "2026-06-29",
  "2026-07-13",
  "2026-07-20",
  "2026-08-07",
  "2026-08-17",
  "2026-10-12",
  "2026-11-02",
  "2026-11-16",
  "2026-12-08",
  "2026-12-25",
];

const OFFICIAL_2027 = [
  "2027-01-01",
  "2027-01-11",
  "2027-03-22",
  "2027-03-25",
  "2027-03-26",
  "2027-05-01",
  "2027-05-10",
  "2027-05-31",
  "2027-06-07",
  "2027-07-05",
  "2027-07-12",
  "2027-07-20",
  "2027-08-07",
  "2027-08-16",
  "2027-10-18",
  "2027-11-01",
  "2027-11-15",
  "2027-12-08",
  "2027-12-25",
];

describe("easterSunday", () => {
  it("da la Pascua de varios años", () => {
    expect(easterSunday(2025).toISOString().slice(0, 10)).toBe("2025-04-20");
    expect(easterSunday(2026).toISOString().slice(0, 10)).toBe("2026-04-05");
    expect(easterSunday(2027).toISOString().slice(0, 10)).toBe("2027-03-28");
  });
});

describe("colombianHolidays", () => {
  it("coincide con el calendario oficial de 2026", () => {
    expect(colombianHolidays(2026).map((h) => h.date)).toEqual(OFFICIAL_2026);
  });

  it("coincide con el calendario oficial de 2027", () => {
    expect(colombianHolidays(2027).map((h) => h.date)).toEqual(OFFICIAL_2027);
  });

  it("traslada al lunes los festivos de la Ley 51 de 1983", () => {
    const reyes = colombianHolidays(2026).find((h) => h.name === "Reyes Magos");
    expect(reyes?.date).toBe("2026-01-12");
    expect(new Date(`${reyes?.date}T12:00:00Z`).getUTCDay()).toBe(1);
  });

  it("no traslada los que no son trasladables", () => {
    const may = colombianHolidays(2027).find((h) => h.name === "Día del Trabajo");
    expect(may?.date).toBe("2027-05-01"); // sábado
  });

  it("solo cuenta la Virgen de Chiquinquirá desde 2026", () => {
    expect(colombianHolidays(2025)).toHaveLength(18);
    expect(colombianHolidays(2026)).toHaveLength(19);
  });
});

describe("holidaysBetween", () => {
  it("junta años y respeta los extremos", () => {
    expect(holidaysBetween("2026-12-08", "2027-01-11").map((h) => h.date)).toEqual([
      "2026-12-08",
      "2026-12-25",
      "2027-01-01",
      "2027-01-11",
    ]);
  });
});
