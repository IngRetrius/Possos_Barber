import { describe, expect, it } from "vitest";
import { formatTimeOfDay, groupOpeningHours } from "./hours";

const nb = " ";

describe("formatTimeOfDay", () => {
  it("usa el formato de la app", () => {
    expect(formatTimeOfDay("09:00:00")).toBe(`9:00${nb}a.${nb}m.`);
    expect(formatTimeOfDay("14:30")).toBe(`2:30${nb}p.${nb}m.`);
  });
});

describe("groupOpeningHours", () => {
  it("junta los días con el mismo horario y deja el domingo cerrado", () => {
    const ranges = [1, 2, 3, 4, 5, 6].flatMap((weekday) => [
      { weekday, start_time: "14:00:00", end_time: "19:00:00" },
      { weekday, start_time: "09:00:00", end_time: "12:00:00" },
    ]);
    expect(groupOpeningHours(ranges)).toEqual([
      {
        days: "Lunes a sábado",
        hours: `9:00${nb}a.${nb}m. a 12:00${nb}p.${nb}m. y 2:00${nb}p.${nb}m. a 7:00${nb}p.${nb}m.`,
        closed: false,
      },
      { days: "Domingo", hours: "Cerrado", closed: true },
    ]);
  });

  it("nombra los días sueltos con comas", () => {
    const groups = groupOpeningHours([
      { weekday: 1, start_time: "09:00", end_time: "12:00" },
      { weekday: 3, start_time: "09:00", end_time: "12:00" },
      { weekday: 5, start_time: "09:00", end_time: "12:00" },
    ]);
    expect(groups[0]?.days).toBe("Lunes, miércoles y viernes");
    expect(groups[1]).toMatchObject({ days: "Martes, jueves, sábado y domingo", closed: true });
  });

  it("dos días seguidos no llevan 'a'", () => {
    const groups = groupOpeningHours([
      { weekday: 6, start_time: "09:00", end_time: "12:00" },
      { weekday: 7, start_time: "09:00", end_time: "12:00" },
    ]);
    expect(groups.find((g) => !g.closed)?.days).toBe("Sábado y domingo");
  });

  it("sin rangos devuelve una lista vacía", () => {
    expect(groupOpeningHours([])).toEqual([]);
  });
});

describe("groupOpeningHours en inglés", () => {
  it("usa los nombres y las palabras del inglés", () => {
    const nbsp = " ";
    const ranges = [1, 2, 3, 4, 5, 6].map((weekday) => ({
      weekday,
      start_time: "09:00:00",
      end_time: "12:00:00",
    }));
    expect(groupOpeningHours(ranges, "en")).toEqual([
      { days: "Monday to Saturday", hours: `9:00${nbsp}AM to 12:00${nbsp}PM`, closed: false },
      { days: "Sunday", hours: "Closed", closed: true },
    ]);
  });
});
