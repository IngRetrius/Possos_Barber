import { describe, expect, it } from "vitest";
import { groupQuickSlots, nextDateKey, pickQuickDays } from "./quick-slots";

describe("pickQuickDays", () => {
  it("toma los primeros días con horas, en orden", () => {
    expect(
      pickQuickDays([
        { date: "2026-11-22", slots: 4 },
        { date: "2026-11-20", slots: 0 },
        { date: "2026-11-21", slots: 2 },
        { date: "2026-11-23", slots: 5 },
      ]),
    ).toEqual(["2026-11-21", "2026-11-22"]);
  });

  it("sin días con horas no pide nada", () => {
    expect(pickQuickDays([{ date: "2026-11-20", slots: 0 }])).toEqual([]);
  });
});

describe("nextDateKey", () => {
  it("pasa de mes y de año", () => {
    expect(nextDateKey("2026-11-30")).toBe("2026-12-01");
    expect(nextDateKey("2026-12-31")).toBe("2027-01-01");
  });
});

describe("groupQuickSlots", () => {
  // 3:00, 4:00 y 5:00 p. m. del jue 20 nov en Bogotá; 9:00 a. m. del vie 21 y del sáb 22.
  const slots = [
    "2026-11-21T14:00:00.000Z",
    "2026-11-20T20:00:00.000Z",
    "2026-11-20T21:00:00.000Z",
    "2026-11-20T22:00:00.000Z",
    "2026-11-22T14:00:00.000Z",
  ];

  it("agrupa por día de Bogotá y dice hoy y mañana", () => {
    expect(groupQuickSlots(slots, "2026-11-20")).toEqual([
      {
        date: "2026-11-20",
        relative: "today",
        slots: ["2026-11-20T20:00:00.000Z", "2026-11-20T21:00:00.000Z", "2026-11-20T22:00:00.000Z"],
      },
      { date: "2026-11-21", relative: "tomorrow", slots: ["2026-11-21T14:00:00.000Z"] },
      { date: "2026-11-22", relative: null, slots: ["2026-11-22T14:00:00.000Z"] },
    ]);
  });

  it("muestra a lo sumo el límite, las más cercanas", () => {
    const groups = groupQuickSlots(slots, "2026-11-20", 2);
    expect(groups.flatMap((g) => g.slots)).toEqual([
      "2026-11-20T20:00:00.000Z",
      "2026-11-20T21:00:00.000Z",
    ]);
  });

  it("las 7:00 p. m. de Bogotá caen en su día aunque en UTC ya sea el siguiente", () => {
    expect(groupQuickSlots(["2026-11-21T00:00:00.000Z"], "2026-11-20")).toEqual([
      { date: "2026-11-20", relative: "today", slots: ["2026-11-21T00:00:00.000Z"] },
    ]);
  });

  it("sin horas no hay grupos", () => {
    expect(groupQuickSlots([], "2026-11-20")).toEqual([]);
  });
});
