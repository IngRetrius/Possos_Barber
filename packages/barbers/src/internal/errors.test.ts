import { describe, expect, it } from "vitest";
import { BARBERS_ERROR_CODES, barbersErrorMessage } from "./errors";

describe("barbersErrorMessage", () => {
  it("tiene un texto para cada código y para UNKNOWN", () => {
    for (const code of [...BARBERS_ERROR_CODES, "UNKNOWN"] as const) {
      expect(barbersErrorMessage(code)).toMatch(/\S/);
    }
  });

  it("explica el cruce de bloqueos", () => {
    expect(barbersErrorMessage("TIME_OFF_OVERLAP")).toBe("Ya tienes un bloqueo en ese horario");
  });
});
