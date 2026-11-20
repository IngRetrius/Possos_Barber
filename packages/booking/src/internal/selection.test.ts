import { describe, expect, it } from "vitest";
import {
  ANY_BARBER,
  bookingSteps,
  nextDayWithSlots,
  normalizeInstant,
  parseSelection,
  pickInitialDay,
  selectionHref,
  stepPosition,
} from "./selection";

const SERVICE = "5eed5e00-0000-0000-0000-000000000001";
const BARBER = "5eedba00-0000-0000-0000-000000000001";

describe("parseSelection", () => {
  it("lee lo elegido y normaliza la hora", () => {
    expect(
      parseSelection({
        servicio: SERVICE,
        barbero: BARBER,
        fecha: "2026-11-20",
        hora: "2026-11-20T20:00:00+00:00",
      }),
    ).toEqual({
      serviceId: SERVICE,
      barberId: BARBER,
      date: "2026-11-20",
      startAt: "2026-11-20T20:00:00.000Z",
    });
  });

  it("acepta cualquiera disponible y URLSearchParams", () => {
    const params = new URLSearchParams({ servicio: SERVICE, barbero: ANY_BARBER });
    expect(parseSelection(params).barberId).toBe(ANY_BARBER);
  });

  it("descarta lo que no tiene forma válida", () => {
    expect(
      parseSelection({
        servicio: "x'; drop table",
        barbero: "otro",
        fecha: "2026-02-30",
        hora: "mañana",
      }),
    ).toEqual({ serviceId: null, barberId: null, date: null, startAt: null });
  });

  it("toma el primer valor si el parámetro viene repetido", () => {
    expect(parseSelection({ servicio: [SERVICE, "otro"] }).serviceId).toBe(SERVICE);
  });
});

describe("selectionHref", () => {
  it("arma la ruta con los parámetros en orden y sin los vacíos", () => {
    expect(
      selectionHref("/reservar/horario", {
        serviceId: SERVICE,
        barberId: null,
        date: "2026-11-20",
        startAt: null,
      }),
    ).toBe(`/reservar/horario?servicio=${SERVICE}&fecha=2026-11-20`);
  });

  it("codifica la hora y agrega los extra", () => {
    const href = selectionHref(
      "/reservar/horario",
      { serviceId: SERVICE, startAt: "2026-11-20T20:00:00.000Z" },
      { aviso: "ocupada" },
    );
    expect(href).toBe(
      `/reservar/horario?servicio=${SERVICE}&hora=2026-11-20T20%3A00%3A00.000Z&aviso=ocupada`,
    );
    expect(parseSelection(new URL(href, "http://x").searchParams).startAt).toBe(
      "2026-11-20T20:00:00.000Z",
    );
  });

  it("sin nada elegido devuelve la ruta sola", () => {
    expect(selectionHref("/reservar", {})).toBe("/reservar");
  });
});

describe("pasos", () => {
  it("con un servicio y un barbero son 2: horario y confirmar", () => {
    const steps = bookingSteps({ services: 1, barbers: 1 });
    expect(steps).toEqual(["time", "confirm"]);
    expect(stepPosition("confirm", steps)).toEqual({ step: 2, total: 2, name: "Confirmar" });
  });

  it("con varios servicios y barberos son 4", () => {
    const steps = bookingSteps({ services: 3, barbers: 2 });
    expect(steps).toEqual(["service", "barber", "time", "confirm"]);
    expect(stepPosition("time", steps)).toEqual({ step: 3, total: 4, name: "Horario" });
    expect(stepPosition("time", steps, "en").name).toBe("Time");
  });

  it("si se salta el barbero, el indicador dice de 3", () => {
    expect(stepPosition("time", bookingSteps({ services: 2, barbers: 1 }))).toEqual({
      step: 2,
      total: 3,
      name: "Horario",
    });
  });
});

describe("día inicial", () => {
  const days = [
    { date: "2026-11-19", slots: 0 },
    { date: "2026-11-20", slots: 0 },
    { date: "2026-11-21", slots: 4 },
    { date: "2026-11-22", slots: 0 },
    { date: "2026-11-23", slots: 2 },
  ];

  it("es hoy si tiene horas", () => {
    expect(pickInitialDay([{ date: "2026-11-19", slots: 3 }], "2026-11-19")).toEqual({
      date: "2026-11-19",
      skippedToday: false,
    });
  });

  it("si hoy no tiene horas, es el primer día con horas", () => {
    expect(pickInitialDay(days, "2026-11-19")).toEqual({ date: "2026-11-21", skippedToday: true });
  });

  it("si ningún día tiene horas, se queda en hoy", () => {
    expect(pickInitialDay([{ date: "2026-11-19", slots: 0 }], "2026-11-19")).toEqual({
      date: "2026-11-19",
      skippedToday: false,
    });
  });

  it("la próxima hora libre está en el siguiente día con horas", () => {
    expect(nextDayWithSlots(days, "2026-11-21")).toBe("2026-11-23");
    expect(nextDayWithSlots(days, "2026-11-23")).toBeNull();
  });
});

describe("normalizeInstant", () => {
  it("devuelve null para lo que no es fecha", () => {
    expect(normalizeInstant("")).toBeNull();
    expect(normalizeInstant(undefined)).toBeNull();
    expect(normalizeInstant("2026-11-20 15:00:00-05")).toBe("2026-11-20T20:00:00.000Z");
  });
});
