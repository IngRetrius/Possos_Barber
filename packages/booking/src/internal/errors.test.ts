import { errorCode } from "@possos/supabase";
import { describe, expect, it } from "vitest";
import { BOOKING_ERROR_CODES, bookingErrorMessage } from "./errors";

describe("bookingErrorMessage", () => {
  it("usa los textos de docs/11", () => {
    expect(bookingErrorMessage("SLOT_TAKEN")).toBe("Esa hora se acaba de ocupar, elige otra");
    expect(bookingErrorMessage("TOO_LATE_TO_CANCEL")).toBe(
      "Ya no puedes cambiarla desde aquí. Escríbele al barbero",
    );
  });

  it("tiene un texto para cada código y para UNKNOWN", () => {
    for (const code of [...BOOKING_ERROR_CODES, "UNKNOWN"] as const) {
      expect(bookingErrorMessage(code)).toMatch(/\S/);
    }
  });

  it("no usa emojis", () => {
    for (const code of [...BOOKING_ERROR_CODES, "UNKNOWN"] as const) {
      expect(bookingErrorMessage(code)).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });
});

describe("errorCode con los códigos de booking", () => {
  it("reconoce el código que lanza Postgres en el mensaje", () => {
    expect(errorCode({ message: "SLOT_TAKEN" }, BOOKING_ERROR_CODES)).toBe("SLOT_TAKEN");
    expect(errorCode({ message: " IN_TIME_OFF " }, BOOKING_ERROR_CODES)).toBe("IN_TIME_OFF");
  });

  it("devuelve UNKNOWN para errores que no son del dominio", () => {
    expect(
      errorCode({ message: "permission denied for table appointments" }, BOOKING_ERROR_CODES),
    ).toBe("UNKNOWN");
    expect(errorCode({ message: "TIME_OFF_OVERLAP" }, BOOKING_ERROR_CODES)).toBe("UNKNOWN");
    expect(errorCode(null, BOOKING_ERROR_CODES)).toBe("UNKNOWN");
  });
});
