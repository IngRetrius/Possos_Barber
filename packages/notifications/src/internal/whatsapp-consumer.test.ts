import { describe, expect, it, vi } from "vitest";
import type { BookingEvent } from "@possos/booking/events";
import { planJobs, whatsappConsumer, type WhatsappConsumerDeps } from "./whatsapp-consumer";
import { APPOINTMENT_ID, appointment } from "./whatsapp-test-helpers";

const NOW = new Date("2026-11-20T15:00:00Z");
const settings = {
  reminder_offsets_min: [1440, 120],
  send_confirmation: true,
  send_cancellation: false,
};

function event(
  type: BookingEvent["type"],
  patch: Partial<BookingEvent["payload"]> = {},
  createdAt = NOW.toISOString(),
): BookingEvent {
  return {
    id: 1,
    type,
    version: 1,
    appointment_id: APPOINTMENT_ID,
    payload: {
      appointment_id: APPOINTMENT_ID,
      barber_id: "b1",
      customer_id: "c1",
      service_id: "s1",
      start_at: "2026-11-21T20:00:00+00:00",
      end_at: "2026-11-21T21:00:00+00:00",
      status: "booked",
      previous_status: null,
      source: "customer",
      cancelled_by: null,
      rescheduled_from: null,
      ...patch,
    },
    created_at: createdAt,
  };
}

describe("planJobs", () => {
  it("una cita para mañana: confirmación ya, recordatorio de 24 h y de 2 h", () => {
    expect(
      planJobs({ appointment_id: "a", start_at: "2026-11-21T20:00:00Z" }, settings, NOW, true),
    ).toEqual([
      {
        appointment_id: "a",
        kind: "confirmation",
        offset_min: 0,
        template: "cita_confirmada",
        send_at: NOW.toISOString(),
      },
      {
        appointment_id: "a",
        kind: "reminder",
        offset_min: 1440,
        template: "recordatorio_24h",
        send_at: "2026-11-20T20:00:00.000Z",
      },
      {
        appointment_id: "a",
        kind: "reminder",
        offset_min: 120,
        template: "recordatorio_2h",
        send_at: "2026-11-21T18:00:00.000Z",
      },
    ]);
  });

  it("con menos de 24 h no crea el de 24 h", () => {
    const jobs = planJobs(
      { appointment_id: "a", start_at: "2026-11-20T23:00:00Z" },
      settings,
      NOW,
      true,
    );
    expect(jobs.map((j) => j.template)).toEqual(["cita_confirmada", "recordatorio_2h"]);
  });

  it("sin confirmación inmediata, ni cita pasada", () => {
    const off = { ...settings, send_confirmation: false };
    expect(
      planJobs({ appointment_id: "a", start_at: "2026-11-21T20:00:00Z" }, off, NOW, true).map(
        (j) => j.kind,
      ),
    ).toEqual(["reminder", "reminder"]);
    expect(
      planJobs({ appointment_id: "a", start_at: "2026-11-20T14:00:00Z" }, settings, NOW, true),
    ).toEqual([]);
  });

  it("un solo recordatorio lleva los botones", () => {
    const jobs = planJobs(
      { appointment_id: "a", start_at: "2026-11-21T20:00:00Z" },
      { ...settings, reminder_offsets_min: [180] },
      NOW,
      false,
    );
    expect(jobs).toEqual([
      expect.objectContaining({ template: "recordatorio_24h", offset_min: 180 }),
    ]);
  });
});

describe("whatsappConsumer", () => {
  function deps(patch: Partial<WhatsappConsumerDeps> = {}) {
    const created: unknown[] = [];
    const skipped: string[] = [];
    const d: WhatsappConsumerDeps = {
      enabled: true,
      loadAppointment: vi.fn(async () => appointment()),
      loadSettings: async () => settings,
      jobs: {
        create: vi.fn(async (jobs) => {
          created.push(...jobs);
          return true;
        }),
        skipPending: vi.fn(async (id) => {
          skipped.push(id);
          return true;
        }),
      },
      now: () => NOW,
      ...patch,
    };
    return { d, created, skipped };
  }

  it("appointment.created programa los mensajes", async () => {
    const { d, created } = deps();
    expect(await whatsappConsumer(d).handle(event("appointment.created"))).toBe("done");
    expect(created).toHaveLength(3);
  });

  it("respeta whatsapp_opt_in y el celular", async () => {
    for (const patch of [{ whatsapp_opt_in: false }, { customer_phone: null }]) {
      const { d, created } = deps({ loadAppointment: async () => appointment(patch) });
      expect(await whatsappConsumer(d).handle(event("appointment.created"))).toBe("done");
      expect(created).toHaveLength(0);
    }
  });

  it("sin configuración de WhatsApp avanza sin programar", async () => {
    const { d } = deps({ enabled: false });
    expect(await whatsappConsumer(d).handle(event("appointment.created"))).toBe("done");
    expect(d.loadAppointment).not.toHaveBeenCalled();
  });

  it("una cita pendiente de aprobación espera a que la aprueben", async () => {
    const pending = deps({
      loadAppointment: async () => appointment({ status: "pending_approval" }),
    });
    await whatsappConsumer(pending.d).handle(
      event("appointment.created", { status: "pending_approval" }),
    );
    expect(pending.created).toHaveLength(0);

    const approved = deps();
    await whatsappConsumer(approved.d).handle(
      event("appointment.status_changed", {
        status: "booked",
        previous_status: "pending_approval",
      }),
    );
    expect(approved.created).toHaveLength(3);
  });

  it("un evento viejo de una cita que después se canceló no programa nada", async () => {
    const { d, created } = deps({
      loadAppointment: async () => appointment({ status: "cancelled" }),
    });
    await whatsappConsumer(d).handle(event("appointment.created"));
    expect(created).toHaveLength(0);
  });

  it("después de 2 horas no manda la confirmación, solo los recordatorios", async () => {
    const { d, created } = deps();
    const old = new Date(NOW.getTime() - 3 * 60 * 60 * 1000).toISOString();
    await whatsappConsumer(d).handle(event("appointment.created", {}, old));
    expect(created.map((j) => (j as { kind: string }).kind)).toEqual(["reminder", "reminder"]);
  });

  it("cancelar descarta lo pendiente; si canceló el personal y está activo, avisa", async () => {
    const byCustomer = deps();
    await whatsappConsumer(byCustomer.d).handle(
      event("appointment.cancelled", { status: "cancelled", cancelled_by: "customer" }),
    );
    expect(byCustomer.skipped).toEqual([APPOINTMENT_ID]);
    expect(byCustomer.created).toHaveLength(0);

    const off = deps({ loadAppointment: async () => appointment({ status: "cancelled" }) });
    await whatsappConsumer(off.d).handle(
      event("appointment.cancelled", { status: "cancelled", cancelled_by: "staff" }),
    );
    expect(off.created).toHaveLength(0);

    const on = deps({
      loadAppointment: async () => appointment({ status: "cancelled" }),
      loadSettings: async () => ({ ...settings, send_cancellation: true }),
    });
    await whatsappConsumer(on.d).handle(
      event("appointment.cancelled", { status: "cancelled", cancelled_by: "staff" }),
    );
    expect(on.created).toEqual([
      expect.objectContaining({ kind: "cancellation", template: "cita_cancelada" }),
    ]);
  });

  it("reprogramar descarta lo de la cita anterior y programa la nueva", async () => {
    const { d, created, skipped } = deps();
    await whatsappConsumer(d).handle(
      event("appointment.rescheduled", {
        rescheduled_from: "a0000000-0000-4000-8000-000000000009",
      }),
    );
    expect(skipped).toEqual(["a0000000-0000-4000-8000-000000000009"]);
    expect(created).toHaveLength(3);
  });

  it("atendida, no vino o rechazada descartan lo que falta; confirmada no", async () => {
    for (const status of ["completed", "no_show", "rejected"] as const) {
      const { d, skipped } = deps();
      await whatsappConsumer(d).handle(event("appointment.status_changed", { status }));
      expect(skipped).toEqual([APPOINTMENT_ID]);
    }
    const { d, skipped, created } = deps();
    await whatsappConsumer(d).handle(
      event("appointment.status_changed", { status: "confirmed", previous_status: "booked" }),
    );
    expect(skipped).toEqual([]);
    expect(created).toEqual([]);
  });

  it("si la base falla, pide reintento", async () => {
    expect(
      await whatsappConsumer(deps({ loadAppointment: async () => "error" }).d).handle(
        event("appointment.created"),
      ),
    ).toBe("retry");
    expect(
      await whatsappConsumer(deps({ loadSettings: async () => null }).d).handle(
        event("appointment.created"),
      ),
    ).toBe("retry");
    const failing = deps();
    failing.d.jobs.skipPending = async () => false;
    expect(
      await whatsappConsumer(failing.d).handle(
        event("appointment.cancelled", { status: "cancelled" }),
      ),
    ).toBe("retry");
  });
});
