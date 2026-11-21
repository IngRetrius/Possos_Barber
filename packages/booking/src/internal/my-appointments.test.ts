import { APPOINTMENT_STATUS_DISPLAY } from "./status";
import { describe, expect, it } from "vitest";
import {
  atTime,
  canChange,
  canReschedule,
  isUpcoming,
  myStatusDisplay,
  splitMyAppointments,
  type MyAppointment,
} from "./my-appointments";

const NOW = new Date("2026-11-20T15:00:00.000Z"); // 10:00 a. m. en Bogotá

function appt(overrides: Partial<MyAppointment> & { start: string }): MyAppointment {
  const start = overrides.start;
  const end = new Date(new Date(start).getTime() + 3_600_000).toISOString();
  const deadline = new Date(new Date(start).getTime() - 2 * 3_600_000).toISOString();
  return {
    id: overrides.id ?? start,
    status: "booked",
    end,
    serviceId: "s",
    serviceName: "Corte normal",
    addonIds: [],
    serviceActive: true,
    barberId: "b",
    barberName: "Barbero",
    barberActive: true,
    barberWhatsappUrl: null,
    priceCop: null,
    changeDeadline: deadline,
    replacedBy: null,
    ...overrides,
  };
}

describe("canChange", () => {
  it("deja cambiar a más de 2 h", () => {
    expect(canChange(appt({ start: "2026-11-20T18:00:00.000Z" }), NOW)).toBe(true);
  });

  it("no deja cambiar a menos de 2 h, aunque la cita no haya empezado", () => {
    const soon = appt({ start: "2026-11-20T16:30:00.000Z" });
    expect(isUpcoming(soon, NOW)).toBe(true);
    expect(canChange(soon, NOW)).toBe(false);
  });

  it("justo en el límite ya no deja", () => {
    expect(canChange(appt({ start: "2026-11-20T17:00:00.000Z" }), NOW)).toBe(false);
  });

  it("usa el límite que da la base, no 2 h fijas", () => {
    const thirty = appt({
      start: "2026-11-20T16:00:00.000Z",
      changeDeadline: "2026-11-20T15:30:00.000Z",
    });
    expect(canChange(thirty, NOW)).toBe(true);
  });

  it("una cita cancelada o atendida no se cambia", () => {
    expect(canChange(appt({ start: "2026-11-22T15:00:00.000Z", status: "cancelled" }), NOW)).toBe(
      false,
    );
    expect(canChange(appt({ start: "2026-11-22T15:00:00.000Z", status: "completed" }), NOW)).toBe(
      false,
    );
  });

  it("una pendiente de aprobación sí se cambia", () => {
    expect(
      canChange(appt({ start: "2026-11-22T15:00:00.000Z", status: "pending_approval" }), NOW),
    ).toBe(true);
  });
});

describe("canReschedule", () => {
  it("no cambia la hora si el servicio o el barbero ya no están activos", () => {
    const start = "2026-11-22T15:00:00.000Z";
    expect(canReschedule(appt({ start }), NOW)).toBe(true);
    expect(canReschedule(appt({ start, serviceActive: false }), NOW)).toBe(false);
    expect(canReschedule(appt({ start, barberActive: false }), NOW)).toBe(false);
  });
});

describe("splitMyAppointments", () => {
  it("separa las próximas (la más cercana primero) del historial (la más reciente primero)", () => {
    const later = appt({ id: "later", start: "2026-11-25T15:00:00.000Z" });
    const next = appt({ id: "next", start: "2026-11-21T15:00:00.000Z" });
    const now = appt({ id: "now", start: "2026-11-20T14:30:00.000Z" });
    const old = appt({ id: "old", start: "2026-11-01T15:00:00.000Z", status: "completed" });
    const older = appt({ id: "older", start: "2026-10-01T15:00:00.000Z", status: "no_show" });
    const cancelled = appt({
      id: "cancelled",
      start: "2026-11-23T15:00:00.000Z",
      status: "cancelled",
    });
    const { upcoming, past } = splitMyAppointments([older, later, old, cancelled, next, now], NOW);
    expect(upcoming.map((a) => a.id)).toEqual(["now", "next", "later"]);
    expect(past.map((a) => a.id)).toEqual(["cancelled", "old", "older"]);
  });
});

describe("myStatusDisplay", () => {
  it("una cita pasada que el barbero no marcó dice Pasada", () => {
    const passed = appt({ start: "2026-11-19T15:00:00.000Z", status: "confirmed" });
    expect(myStatusDisplay(passed, NOW)).toEqual({ label: "Pasada", tone: "neutral" });
  });

  it("las demás usan la tabla de estados", () => {
    expect(myStatusDisplay(appt({ start: "2026-11-22T15:00:00.000Z" }), NOW)).toEqual({
      label: "Reservada",
      tone: "neutral",
    });
    expect(
      myStatusDisplay(appt({ start: "2026-11-01T15:00:00.000Z", status: "rejected" }), NOW).label,
    ).toBe("Rechazada");
  });
});

describe("atTime", () => {
  it("dice a las, y a la una, a la", () => {
    expect(atTime("2026-11-20T20:00:00.000Z")).toBe("a las 3:00\u00a0p.\u00a0m.");
    expect(atTime("2026-11-20T18:00:00.000Z")).toBe("a la 1:00\u00a0p.\u00a0m.");
    expect(atTime("2026-11-20T16:00:00.000Z")).toBe("a las 11:00\u00a0a.\u00a0m.");
  });
});

describe("en inglés", () => {
  it("dice la hora con at y los estados en inglés", () => {
    expect(atTime("2026-11-20T18:00:00.000Z", "en").replaceAll(" ", " ")).toBe("at 1:00 PM");
    expect(APPOINTMENT_STATUS_DISPLAY.en.booked.label).toBe("Booked");
    expect(APPOINTMENT_STATUS_DISPLAY.es.booked.label).toBe("Reservada");
  });
});
