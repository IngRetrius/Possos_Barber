import { describe, expect, it, vi } from "vitest";
import {
  dispatchDue,
  MAX_ATTEMPTS,
  type ClaimedJob,
  type DispatchDueDeps,
  type JobOutcome,
  type JobStore,
} from "./whatsapp-dispatch";
import { APPOINTMENT_ID, appointment, context, fakeClient } from "./whatsapp-test-helpers";

const NOW = new Date("2026-11-20T20:00:00Z");

interface Row extends ClaimedJob {
  status: string;
  send_at: string;
  provider_message_id: string | null;
  last_error: string | null;
}

/**
 * message_jobs en memoria con la misma regla que claim_message_jobs: toma los vencidos en
 * `scheduled` y los pasa a `sending` de una vez (en la base, for update skip locked). Una tanda
 * que otro despacho ya tomó no aparece en la siguiente llamada.
 */
function memoryJobs(rows: Partial<Row>[], clock: () => Date = () => NOW) {
  const table: Row[] = rows.map((r, i) => ({
    id: `j${i + 1}`,
    appointment_id: APPOINTMENT_ID,
    kind: "reminder",
    template: "recordatorio_24h",
    attempts: 0,
    status: "scheduled",
    send_at: NOW.toISOString(),
    provider_message_id: null,
    last_error: null,
    ...r,
  }));
  const store: JobStore = {
    claim: async (limit) => {
      const due = table
        .filter((r) => r.status === "scheduled" && new Date(r.send_at) <= clock())
        .slice(0, limit);
      for (const r of due) {
        r.status = "sending";
        r.attempts++;
      }
      return due.map((r) => ({ ...r }));
    },
    finish: async (id, o: JobOutcome) => {
      const r = table.find((x) => x.id === id);
      if (!r || r.status !== "sending") return false;
      if (o.outcome === "sent") {
        r.status = "sent";
        r.provider_message_id = o.messageId;
      } else if (o.outcome === "retry") {
        r.status = "scheduled";
        r.send_at = o.at.toISOString();
        r.last_error = o.error;
      } else {
        r.status = o.outcome;
        r.last_error = o.outcome === "failed" ? o.error : o.reason;
      }
      return true;
    },
  };
  return { store, table };
}

function deps(store: JobStore, patch: Partial<DispatchDueDeps> = {}): DispatchDueDeps {
  return {
    jobs: store,
    loadAppointment: async () => appointment(),
    client: fakeClient(),
    context,
    now: () => NOW,
    ...patch,
  };
}

describe("dispatchDue", () => {
  it("manda el trabajo vencido y guarda el id de Meta", async () => {
    const { store, table } = memoryJobs([{}]);
    const client = fakeClient();
    const report = await dispatchDue(deps(store, { client }));
    expect(report).toEqual({ sent: 1, retried: 0, failed: 0, skipped: 0 });
    expect(client.templates[0]!.to).toBe("+573001234567");
    expect(client.templates[0]!.template.name).toBe("recordatorio_24h");
    expect(table[0]).toMatchObject({ status: "sent", provider_message_id: "wamid.prueba1" });
  });

  it("si el cron corre dos veces a la vez, ningún mensaje sale dos veces", async () => {
    const { store, table } = memoryJobs(Array.from({ length: 25 }, () => ({})));
    const client = fakeClient();
    const [a, b] = await Promise.all([
      dispatchDue(deps(store, { client })),
      dispatchDue(deps(store, { client })),
    ]);
    expect(a.sent + b.sent).toBe(25);
    expect(client.sendTemplate).toHaveBeenCalledTimes(25);
    expect(new Set(table.map((r) => r.provider_message_id)).size).toBe(25);
  });

  it("un error de red se reintenta más tarde, sin pasar de la hora de la cita", async () => {
    let now = NOW;
    const { store, table } = memoryJobs([{}], () => now);
    const client = fakeClient([{ ok: false, retryable: true, error: "NETWORK" }]);
    const report = await dispatchDue(deps(store, { client, now: () => now }));
    expect(report.retried).toBe(1);
    expect(table[0]).toMatchObject({
      status: "scheduled",
      last_error: "NETWORK",
      send_at: "2026-11-20T20:01:00.000Z",
    });

    // Al vencer, el siguiente despacho lo vuelve a tomar y esta vez sale.
    expect((await dispatchDue(deps(store, { client, now: () => now }))).sent).toBe(0);
    now = new Date("2026-11-20T20:01:00Z");
    const again = await dispatchDue(deps(store, { client, now: () => now }));
    expect(again.sent).toBe(1);
    expect(table[0]).toMatchObject({ status: "sent", attempts: 2 });
  });

  it("después del último intento queda failed con el error", async () => {
    const { store, table } = memoryJobs([{ attempts: MAX_ATTEMPTS - 1 }]);
    const client = fakeClient([
      { ok: false, retryable: true, error: "131000: Something went wrong" },
    ]);
    expect((await dispatchDue(deps(store, { client }))).failed).toBe(1);
    expect(table[0]).toMatchObject({
      status: "failed",
      last_error: "131000: Something went wrong",
    });
  });

  it("un número sin WhatsApp falla de una vez", async () => {
    const { store, table } = memoryJobs([{}]);
    const client = fakeClient([
      { ok: false, retryable: false, error: "131026: Message undeliverable", code: 131026 },
    ]);
    await dispatchDue(deps(store, { client }));
    expect(table[0]).toMatchObject({ status: "failed", attempts: 1 });
  });

  it("no reintenta si el reintento caería después de la cita", async () => {
    const { store, table } = memoryJobs([{}]);
    const client = fakeClient([{ ok: false, retryable: true, error: "TIMEOUT" }]);
    await dispatchDue(
      deps(store, {
        client,
        loadAppointment: async () => appointment({ start_at: "2026-11-20T20:00:30Z" }),
      }),
    );
    expect(table[0]!.status).toBe("failed");
  });

  it("vuelve a leer la cita: cancelada, pasada o sin autorización no recibe nada", async () => {
    const cases = [
      [appointment({ status: "cancelled" }), "INACTIVE"],
      [appointment({ start_at: "2026-11-20T19:00:00Z" }), "TOO_LATE"],
      [appointment({ whatsapp_opt_in: false }), "OPTED_OUT"],
      [appointment({ customer_phone: null }), "NO_PHONE"],
      [null, "NOT_FOUND"],
    ] as const;
    for (const [loaded, reason] of cases) {
      const { store, table } = memoryJobs([{}]);
      const client = fakeClient();
      await dispatchDue(deps(store, { client, loadAppointment: async () => loaded }));
      expect(client.sendTemplate).not.toHaveBeenCalled();
      expect(table[0]).toMatchObject({ status: "skipped", last_error: reason });
    }
  });

  it("el aviso de cancelación sí sale con la cita cancelada", async () => {
    const { store, table } = memoryJobs([{ kind: "cancellation", template: "cita_cancelada" }]);
    await dispatchDue(
      deps(store, { loadAppointment: async () => appointment({ status: "cancelled" }) }),
    );
    expect(table[0]!.status).toBe("sent");
  });

  it("sin configuración de Meta descarta lo vencido, para que el respaldo no insista", async () => {
    const { store, table } = memoryJobs([{}]);
    await dispatchDue(deps(store, { client: null }));
    expect(table[0]).toMatchObject({ status: "skipped", last_error: "NOT_CONFIGURED" });
  });

  it("si la base falla al leer la cita, reintenta", async () => {
    const { store, table } = memoryJobs([{}]);
    await dispatchDue(deps(store, { loadAppointment: async () => "error" }));
    expect(table[0]).toMatchObject({ status: "scheduled", last_error: "DB_ERROR" });
  });

  it("si la base falla al tomar trabajos, lo dice", async () => {
    const report = await dispatchDue(
      deps({ claim: async () => null, finish: vi.fn(async () => true) }),
    );
    expect(report.error).toBe("CLAIM_FAILED");
  });
});
