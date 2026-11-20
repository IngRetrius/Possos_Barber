import { describe, expect, it } from "vitest";
import { validateBookingSettings } from "./settings";

describe("validateBookingSettings", () => {
  it("acepta los valores del dueño", () => {
    expect(
      validateBookingSettings({
        minLeadMin: "60",
        maxDaysAhead: "30",
        cancelWindowMin: "120",
        noShowThreshold: "2",
      }),
    ).toEqual({
      ok: true,
      data: { min_lead_min: 60, max_days_ahead: 30, cancel_window_min: 120, no_show_threshold: 2 },
    });
  });

  it("rechaza lo que no es un entero en rango", () => {
    const result = validateBookingSettings({
      minLeadMin: "-1",
      maxDaysAhead: "0",
      cancelWindowMin: "1,5",
      noShowThreshold: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors)).toHaveLength(4);
  });
});
