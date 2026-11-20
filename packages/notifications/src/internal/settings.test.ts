import { describe, expect, it } from "vitest";
import { offsetToHours, validateReminderSettings } from "./settings";

const base = { sendConfirmation: true, sendCancellation: false };

describe("validateReminderSettings", () => {
  it("pasa las horas a minutos", () => {
    expect(validateReminderSettings({ ...base, firstHours: "24", secondHours: "2" })).toEqual({
      ok: true,
      data: {
        reminder_offsets_min: [1440, 120],
        send_confirmation: true,
        send_cancellation: false,
      },
    });
    expect(
      validateReminderSettings({
        firstHours: "24",
        secondHours: "",
        sendConfirmation: false,
        sendCancellation: true,
      }),
    ).toEqual({
      ok: true,
      data: { reminder_offsets_min: [1440], send_confirmation: false, send_cancellation: true },
    });
  });

  it("pide el segundo más cerca de la cita", () => {
    expect(validateReminderSettings({ ...base, firstHours: "2", secondHours: "24" }).ok).toBe(
      false,
    );
  });

  it("muestra los minutos como horas", () => {
    expect(offsetToHours(1440)).toBe("24");
    expect(offsetToHours(90)).toBe("1,5");
    expect(offsetToHours(undefined)).toBe("");
  });
});
