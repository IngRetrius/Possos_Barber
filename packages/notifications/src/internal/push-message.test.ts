import { describe, expect, it } from "vitest";
import type { BookingEvent, AppointmentEventPayloadV1 } from "@possos/booking/events";
import { pushKindFor, pushMessageFor, type PushFormat } from "./push-message";

const payload: AppointmentEventPayloadV1 = {
  appointment_id: "a1",
  barber_id: "b1",
  customer_id: "c1",
  service_id: "s1",
  start_at: "2026-11-20T20:00:00+00:00",
  end_at: "2026-11-20T21:00:00+00:00",
  status: "booked",
  previous_status: null,
  source: "customer",
  cancelled_by: null,
  rescheduled_from: null,
};

function event(
  type: BookingEvent["type"],
  patch: Partial<AppointmentEventPayloadV1> = {},
): BookingEvent {
  return {
    id: 1,
    type,
    version: 1,
    appointment_id: "a1",
    payload: { ...payload, ...patch },
    created_at: "2026-11-19T20:00:00+00:00",
  };
}

const format: PushFormat = {
  when: () => "vie 20 nov, 3:00 p. m.",
  day: () => "2026-11-20",
};

const appointment = {
  appointment_id: "a1",
  start_at: payload.start_at,
  service_name: "Corte normal",
  customer_name: "Ana Gómez",
};

describe("pushKindFor", () => {
  it("avisa lo que hace el cliente", () => {
    expect(pushKindFor(event("appointment.created"))).toBe("created");
    expect(pushKindFor(event("appointment.created", { status: "pending_approval" }))).toBe(
      "pending",
    );
    expect(pushKindFor(event("appointment.rescheduled", { rescheduled_from: "a0" }))).toBe(
      "rescheduled",
    );
    expect(pushKindFor(event("appointment.rescheduled", { status: "pending_approval" }))).toBe(
      "rescheduled_pending",
    );
    expect(
      pushKindFor(
        event("appointment.cancelled", { status: "cancelled", cancelled_by: "customer" }),
      ),
    ).toBe("cancelled");
    expect(
      pushKindFor(
        event("appointment.status_changed", { status: "confirmed", previous_status: "booked" }),
      ),
    ).toBe("confirmed");
  });

  it("no avisa lo que hace el personal", () => {
    expect(pushKindFor(event("appointment.created", { source: "staff" }))).toBeNull();
    expect(pushKindFor(event("appointment.rescheduled", { source: "staff" }))).toBeNull();
    expect(
      pushKindFor(event("appointment.cancelled", { status: "cancelled", cancelled_by: "staff" })),
    ).toBeNull();
    for (const [status, previous] of [
      ["booked", "pending_approval"],
      ["rejected", "pending_approval"],
      ["completed", "confirmed"],
      ["no_show", "booked"],
    ] as const) {
      expect(
        pushKindFor(event("appointment.status_changed", { status, previous_status: previous })),
      ).toBeNull();
    }
  });

  it("ignora versiones que no conoce", () => {
    const future = { ...event("appointment.created"), version: 2 } as unknown as BookingEvent;
    expect(pushKindFor(future)).toBeNull();
  });
});

describe("pushMessageFor", () => {
  it("arma el texto y abre la cita en Hoy, en su día", () => {
    expect(pushMessageFor("created", appointment, format)).toEqual({
      title: "Nueva reserva",
      body: "Ana Gómez · Corte normal · vie 20 nov, 3:00 p. m.",
      url: "/panel?dia=2026-11-20&cita=a1",
      tag: "cita-a1",
    });
  });

  it("al cambiar la hora dice la nueva", () => {
    const message = pushMessageFor("rescheduled", appointment, format);
    expect(message.title).toBe("Cita cambiada");
    expect(message.body).toBe("Ana Gómez · Corte normal · ahora el vie 20 nov, 3:00 p. m.");
  });

  it("tiene un título por cada caso", () => {
    expect(pushMessageFor("pending", appointment, format).title).toBe("Reserva por aprobar");
    expect(pushMessageFor("rescheduled_pending", appointment, format).title).toBe(
      "Cambio por aprobar",
    );
    expect(pushMessageFor("cancelled", appointment, format).title).toBe("Cita cancelada");
    expect(pushMessageFor("confirmed", appointment, format).title).toBe("Cita confirmada");
  });

  it("nunca lleva el celular del cliente", () => {
    const withPhone = { ...appointment, customer_phone: "+573001234567" };
    const message = pushMessageFor("created", withPhone, format);
    expect(JSON.stringify(message)).not.toContain("300");
  });
});
