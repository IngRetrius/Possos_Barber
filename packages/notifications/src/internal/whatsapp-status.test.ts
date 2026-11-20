import { describe, expect, it } from "vitest";
import {
  errorCodeOf,
  reminderFailed,
  reminderSummary,
  whatsappCostEstimate,
  type MessageJobView,
} from "./whatsapp-status";

function job(patch: Partial<MessageJobView>): MessageJobView {
  return {
    channel: "whatsapp",
    kind: "reminder",
    template: "recordatorio_24h",
    status: "scheduled",
    send_at: "2026-11-20T20:00:00Z",
    sent_at: null,
    status_at: null,
    last_error: null,
    ...patch,
  };
}

describe("reminderSummary", () => {
  it("sin mensajes, o todos descartados, no muestra nada", () => {
    expect(reminderSummary([])).toBeNull();
    expect(reminderSummary([job({ status: "skipped" })])).toBeNull();
    expect(reminderSummary([job({ channel: "push" })])).toBeNull();
  });

  it("el último que salió y el próximo programado", () => {
    expect(
      reminderSummary([
        job({
          kind: "confirmation",
          status: "delivered",
          send_at: "2026-11-19T15:00:00Z",
          sent_at: "2026-11-19T15:00:02Z",
          status_at: "2026-11-19T15:00:05Z",
        }),
        job({ status: "scheduled", send_at: "2026-11-20T20:00:00Z" }),
        job({ status: "scheduled", send_at: "2026-11-21T18:00:00Z", template: "recordatorio_2h" }),
      ]),
    ).toEqual({
      last: {
        kind: "confirmation",
        state: "delivered",
        at: "2026-11-19T15:00:05Z",
        phoneProblem: false,
      },
      next: { kind: "reminder", at: "2026-11-20T20:00:00Z" },
    });
  });

  it("un número sin WhatsApp se marca para revisar", () => {
    const summary = reminderSummary([
      job({
        status: "failed",
        sent_at: "2026-11-20T20:00:01Z",
        last_error: "131026: Message undeliverable",
      }),
    ]);
    expect(summary?.last).toMatchObject({ state: "failed", phoneProblem: true });
    expect(reminderFailed(summary)).toBe(true);
    expect(
      reminderSummary([
        job({ status: "failed", last_error: "132001: Template name does not exist" }),
      ])?.last?.phoneProblem,
    ).toBe(false);
  });

  it("errorCodeOf lee el código de last_error", () => {
    expect(errorCodeOf("131026: Message undeliverable")).toBe(131026);
    expect(errorCodeOf("NETWORK")).toBeNull();
    expect(errorCodeOf(null)).toBeNull();
  });
});

describe("whatsappCostEstimate", () => {
  it("cobra los entregados de utilidad, y aparte los que Meta pasó a marketing", () => {
    expect(whatsappCostEstimate({ accepted: 400, delivered: 390, marketing: 0, failed: 2 })).toBe(
      1170,
    );
    expect(whatsappCostEstimate({ accepted: 10, delivered: 10, marketing: 2, failed: 0 })).toBe(
      8 * 3 + 2 * 46,
    );
    expect(whatsappCostEstimate({ accepted: 0, delivered: 0, marketing: 0, failed: 0 })).toBe(0);
  });
});
