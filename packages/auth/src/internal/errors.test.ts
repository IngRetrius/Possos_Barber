import { describe, expect, it } from "vitest";
import { AUTH_ERROR_CODES, authErrorCode, authErrorMessage, type AuthErrorCode } from "./errors";

describe("authErrorCode", () => {
  it.each([
    [{ code: "invalid_credentials" }, "INVALID_CREDENTIALS"],
    [{ code: "email_not_confirmed" }, "EMAIL_NOT_CONFIRMED"],
    [{ code: "weak_password" }, "WEAK_PASSWORD"],
    [{ code: "otp_expired" }, "LINK_EXPIRED"],
    [{ code: "bad_code_verifier" }, "LINK_EXPIRED"],
    [{ code: "over_email_send_rate_limit" }, "RATE_LIMITED"],
    [{ code: "provider_disabled" }, "GOOGLE_FAILED"],
    [{ message: "FORBIDDEN" }, "FORBIDDEN"],
    [{ message: "NOT_AUTHENTICATED" }, "NOT_AUTHENTICATED"],
    [{ message: "Invalid login credentials" }, "INVALID_CREDENTIALS"],
    [{ message: "Unsupported provider: provider is not enabled" }, "GOOGLE_FAILED"],
    [{ code: "algo_nuevo", message: "Algo nuevo" }, "UNKNOWN"],
    [null, "UNKNOWN"],
  ] as const)("%j es %s", (error, expected) => {
    expect(authErrorCode(error)).toBe(expected);
  });
});

describe("authErrorMessage", () => {
  it("tiene texto para cada código, en tuteo y sin signos de apertura sueltos", () => {
    for (const code of [...AUTH_ERROR_CODES, "UNKNOWN"] as AuthErrorCode[]) {
      const text = authErrorMessage(code);
      expect(text.length).toBeGreaterThan(0);
      expect(text).not.toMatch(/usted/i);
    }
  });

  it("dice el mínimo real de la contraseña", () => {
    expect(authErrorMessage("WEAK_PASSWORD")).toBe(
      "La contraseña debe tener al menos 8 caracteres",
    );
  });
});
