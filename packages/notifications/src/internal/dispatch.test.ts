import { describe, expect, it, vi } from "vitest";
import type { BookingEvent } from "@possos/booking/events";
import { BATCH_SIZE, runConsumer, type CursorStore, type EventConsumer } from "./dispatch";
import { pushConsumer, PUSH_MAX_AGE_MS, type PushConsumerDeps } from "./push-consumer";

function makeEvent(id: number, patch: Partial<BookingEvent["payload"]> = {}): BookingEvent {
  return {
    id,
    type: "appointment.created",
    version: 1,
    appointment_id: `a${id}`,
    payload: {
      appointment_id: `a${id}`,
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
      ...patch,
    },
    created_at: "2026-11-19T20:00:00+00:00",
  };
}

/** Un cursor en memoria que se comporta como claim/ack de la base. */
function memoryStore(events: BookingEvent[], opts: { busy?: boolean } = {}) {
  let cursor = 0;
  let leased = Boolean(opts.busy);
  const acks: (number | null)[] = [];
  const store: CursorStore = {
    claim: async (_consumer, limit) => {
      if (leased) return "busy";
      leased = true;
      return events.filter((e) => e.id > cursor).slice(0, limit);
    },
    ack: async (_consumer, last) => {
      acks.push(last);
      if (last !== null) cursor = Math.max(cursor, last);
      leased = false;
      return events.some((e) => e.id > cursor);
    },
  };
  return { store, acks, cursor: () => cursor };
}

describe("runConsumer", () => {
  it("resuelve los eventos en orden y avanza el cursor", async () => {
    const seen: number[] = [];
    const consumer: EventConsumer = {
      name: "prueba",
      handle: async (e) => {
        seen.push(e.id);
        return "done";
      },
    };
    const { store, cursor } = memoryStore([makeEvent(1), makeEvent(2), makeEvent(3)]);
    const report = await runConsumer(store, consumer);
    expect(seen).toEqual([1, 2, 3]);
    expect(cursor()).toBe(3);
    expect(report).toEqual({ handled: 3, pending: false });
  });

  it("sigue con otra tanda si quedan más eventos", async () => {
    const events = Array.from({ length: BATCH_SIZE + 3 }, (_, i) => makeEvent(i + 1));
    const { store, cursor } = memoryStore(events);
    const report = await runConsumer(store, { name: "prueba", handle: async () => "done" });
    expect(cursor()).toBe(BATCH_SIZE + 3);
    expect(report.handled).toBe(BATCH_SIZE + 3);
  });

  it("se para en un evento que pide reintento, sin pasar el cursor", async () => {
    const { store, cursor, acks } = memoryStore([makeEvent(1), makeEvent(2), makeEvent(3)]);
    const report = await runConsumer(store, {
      name: "prueba",
      handle: async (e) => (e.id === 2 ? "retry" : "done"),
    });
    expect(cursor()).toBe(1);
    expect(acks).toEqual([1]);
    expect(report).toEqual({ handled: 1, pending: true, error: "HANDLER_FAILED" });
  });

  it("un consumidor que lanza cuenta como reintento", async () => {
    const log = vi.fn();
    const { store, cursor } = memoryStore([makeEvent(1)]);
    const report = await runConsumer(
      store,
      {
        name: "prueba",
        handle: async () => {
          throw new Error("caído");
        },
      },
      log,
    );
    expect(cursor()).toBe(0);
    expect(report.error).toBe("HANDLER_FAILED");
    expect(log).toHaveBeenCalledOnce();
  });

  it("si otro despacho tiene el turno, no lo suelta", async () => {
    const { store, acks } = memoryStore([makeEvent(1)], { busy: true });
    const report = await runConsumer(store, { name: "prueba", handle: async () => "done" });
    expect(report.busy).toBe(true);
    expect(acks).toEqual([]);
  });

  it("sin eventos, igual suelta el turno", async () => {
    const { store, acks } = memoryStore([]);
    await runConsumer(store, { name: "prueba", handle: async () => "done" });
    expect(acks).toEqual([null]);
  });
});

describe("pushConsumer", () => {
  const now = () => new Date("2026-11-19T20:05:00Z");

  function deps(patch: Partial<PushConsumerDeps> = {}): PushConsumerDeps {
    return {
      loadAppointment: async (id) => ({
        appointment_id: id,
        start_at: "2026-11-20T20:00:00+00:00",
        service_name: "Corte normal",
        customer_name: "Ana Gómez",
      }),
      listTargets: async () => [{ endpoint: "https://push.test/1", p256dh: "k", auth: "a" }],
      removeTargets: vi.fn(async () => {}),
      send: vi.fn(async () => ({ sent: 1, gone: [], failed: 0 })),
      format: { when: () => "vie 20 nov, 3:00 p. m.", day: () => "2026-11-20" },
      now,
      ...patch,
    };
  }

  it("manda el aviso al barbero de la cita", async () => {
    const d = deps();
    expect(await pushConsumer(d).handle(makeEvent(7))).toBe("done");
    expect(d.send).toHaveBeenCalledWith(
      [{ endpoint: "https://push.test/1", p256dh: "k", auth: "a" }],
      expect.objectContaining({ title: "Nueva reserva", url: "/panel?dia=2026-11-20&cita=a7" }),
    );
  });

  it("borra las suscripciones que el servicio da por muertas", async () => {
    const d = deps({
      send: vi.fn(async () => ({ sent: 0, gone: ["https://push.test/1"], failed: 0 })),
    });
    await pushConsumer(d).handle(makeEvent(7));
    expect(d.removeTargets).toHaveBeenCalledWith(["https://push.test/1"]);
  });

  it("no avisa lo que hizo el personal ni lo muy viejo", async () => {
    const d = deps();
    await pushConsumer(d).handle(makeEvent(7, { source: "staff" }));
    const old = {
      ...makeEvent(8),
      created_at: new Date(now().getTime() - PUSH_MAX_AGE_MS - 1).toISOString(),
    };
    await pushConsumer(d).handle(old);
    expect(d.send).not.toHaveBeenCalled();
  });

  it("sin claves VAPID avanza sin mandar", async () => {
    const loadAppointment = vi.fn();
    expect(await pushConsumer(deps({ send: null, loadAppointment })).handle(makeEvent(7))).toBe(
      "done",
    );
    expect(loadAppointment).not.toHaveBeenCalled();
  });

  it("si la base falla, pide reintento", async () => {
    expect(
      await pushConsumer(deps({ loadAppointment: async () => "error" })).handle(makeEvent(7)),
    ).toBe("retry");
    expect(await pushConsumer(deps({ listTargets: async () => null })).handle(makeEvent(7))).toBe(
      "retry",
    );
  });

  it("un barbero sin celulares suscritos no es un error", async () => {
    const d = deps({ listTargets: async () => [] });
    expect(await pushConsumer(d).handle(makeEvent(7))).toBe("done");
    expect(d.send).not.toHaveBeenCalled();
  });
});
