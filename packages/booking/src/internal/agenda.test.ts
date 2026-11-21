import { describe, expect, it } from "vitest";
import {
  addDays,
  bogotaInstant,
  buildDayAgenda,
  dayOccupancy,
  isoWeekday,
  weekStart,
  type AgendaAppointment,
} from "./agenda";

const DAY = "2026-11-20"; // viernes

function appointment(start: string, end: string, extra: Partial<AgendaAppointment> = {}) {
  return {
    id: `a-${start}`,
    barberId: "b",
    status: "booked",
    start: bogotaInstant(DAY, start),
    end: bogotaInstant(DAY, end),
    priceCop: null,
    serviceId: "s",
    serviceName: "Corte normal",
    addonIds: [],
    customerId: "c",
    customerName: "Carlos",
    customerPhone: null,
    source: "staff",
    ...extra,
  } satisfies AgendaAppointment;
}

describe("fechas", () => {
  it("convierte la hora de Bogotá a UTC", () => {
    expect(bogotaInstant(DAY, "09:00")).toBe("2026-11-20T14:00:00.000Z");
  });

  it("calcula días y semanas", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(isoWeekday(DAY)).toBe(5);
    expect(isoWeekday("2026-11-22")).toBe(7);
    expect(weekStart(DAY)).toBe("2026-11-16");
    expect(weekStart("2026-11-16")).toBe("2026-11-16");
  });
});

describe("buildDayAgenda", () => {
  it("mezcla citas, horas libres y bloqueos en orden", () => {
    const items = buildDayAgenda({
      day: DAY,
      ranges: [
        { start_time: "09:00", end_time: "12:00" },
        { start_time: "14:00:00", end_time: "16:00:00" },
      ],
      intervalMin: 60,
      appointments: [appointment("10:00", "11:00")],
      blocks: [
        {
          id: "t",
          start: bogotaInstant(DAY, "14:00"),
          end: bogotaInstant(DAY, "15:00"),
          reason: "Almuerzo",
        },
      ],
    });
    expect(items.map((i) => `${i.kind} ${i.start}`)).toEqual([
      `free ${bogotaInstant(DAY, "09:00")}`,
      `appointment ${bogotaInstant(DAY, "10:00")}`,
      `free ${bogotaInstant(DAY, "11:00")}`,
      `blocked ${bogotaInstant(DAY, "14:00")}`,
      `free ${bogotaInstant(DAY, "15:00")}`,
    ]);
  });

  it("no ofrece una hora libre que se cruza con una cita corrida", () => {
    const items = buildDayAgenda({
      day: DAY,
      ranges: [{ start_time: "09:00", end_time: "12:00" }],
      intervalMin: 60,
      appointments: [appointment("09:30", "10:30")],
      blocks: [],
    });
    expect(items.filter((i) => i.kind === "free").map((i) => i.start)).toEqual([
      bogotaInstant(DAY, "11:00"),
    ]);
  });

  it("muestra un bloqueo de varios días recortado al día, como todo el día", () => {
    const items = buildDayAgenda({
      day: DAY,
      ranges: [{ start_time: "09:00", end_time: "12:00" }],
      intervalMin: 60,
      appointments: [],
      blocks: [
        {
          id: "v",
          start: bogotaInstant("2026-11-19", "00:00"),
          end: bogotaInstant("2026-11-23", "00:00"),
          reason: "Vacaciones",
        },
      ],
    });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: "blocked", allDay: true });
  });

  it("muestra las citas fuera del horario", () => {
    const items = buildDayAgenda({
      day: DAY,
      ranges: [],
      intervalMin: 60,
      appointments: [appointment("20:00", "21:00")],
      blocks: [],
    });
    expect(items.map((i) => i.kind)).toEqual(["appointment"]);
  });
});

describe("dayOccupancy", () => {
  it("cuenta citas y horas libres", () => {
    const items = buildDayAgenda({
      day: DAY,
      ranges: [{ start_time: "09:00", end_time: "13:00" }],
      intervalMin: 60,
      appointments: [appointment("09:00", "10:00")],
      blocks: [],
    });
    expect(dayOccupancy(items)).toEqual({ appointments: 1, free: 3, ratio: 0.25 });
    expect(dayOccupancy([]).ratio).toBe(0);
  });
});
