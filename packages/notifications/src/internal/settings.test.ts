import { describe, expect, it } from "vitest";
import { offsetToHours, validateReminderSettings } from "./settings";

describe("validateReminderSettings", () => {
  it("pasa las horas a minutos", () => {
    expect(
      validateReminderSettings({ firstHours: "24", secondHours: "2", sendConfirmation: true }),
    ).toEqual({ ok: true, data: { reminder_offsets_min: [1440, 120], send_confirmation: true } });
    expect(
      validateReminderSettings({ firstHours: "24", secondHours: "", sendConfirmation: false }),
    ).toEqual({ ok: true, data: { reminder_offsets_min: [1440], send_confirmation: false } });
  });

  it("pide el segundo más cerca de la cita", () => {
    expect(
      validateReminderSettings({ firstHours: "2", secondHours: "24", sendConfirmation: true }).ok,
    ).toBe(false);
  });

  it("muestra los minutos como horas", () => {
    expect(offsetToHours(1440)).toBe("24");
    expect(offsetToHours(90)).toBe("1,5");
    expect(offsetToHours(undefined)).toBe("");
  });
});
