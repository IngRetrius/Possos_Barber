import { describe, expect, it } from "vitest";
import { DATA_POLICY_VERSION, needsConsent, validateProfile } from "./profile";

const base = {
  fullName: "Ana Pérez",
  phone: "300 123 4567",
  whatsappOptIn: false,
  dataConsent: true,
};

describe("validateProfile", () => {
  it("acepta un perfil completo y deja el celular en E.164", () => {
    expect(validateProfile(base, { requireConsent: true })).toEqual({
      ok: true,
      data: { fullName: "Ana Pérez", phoneE164: "+573001234567", whatsappOptIn: false },
    });
  });

  it("limpia los espacios del nombre", () => {
    const result = validateProfile(
      { ...base, fullName: "  Ana   Pérez " },
      { requireConsent: true },
    );
    expect(result.ok && result.data.fullName).toBe("Ana Pérez");
  });

  it("sin la autorización de datos no pasa", () => {
    expect(validateProfile({ ...base, dataConsent: false }, { requireConsent: true })).toEqual({
      ok: false,
      errors: { dataConsent: "Sin esta autorización no podemos crear tu cuenta" },
    });
  });

  it("la autorización de WhatsApp es opcional", () => {
    expect(validateProfile({ ...base, whatsappOptIn: false }, { requireConsent: true }).ok).toBe(
      true,
    );
  });

  it("al editar, la autorización ya dada no se vuelve a pedir", () => {
    expect(validateProfile({ ...base, dataConsent: false }, { requireConsent: false }).ok).toBe(
      true,
    );
  });

  it("reporta todos los campos con error a la vez", () => {
    const result = validateProfile(
      { fullName: " ", phone: "601 234 5678", whatsappOptIn: true, dataConsent: false },
      { requireConsent: true },
    );
    expect(result).toEqual({
      ok: false,
      errors: {
        fullName: "Escribe tu nombre",
        phone: "Escribe un número de celular: en Colombia empiezan por 3",
        dataConsent: "Sin esta autorización no podemos crear tu cuenta",
      },
    });
  });

  it("rechaza un nombre demasiado largo", () => {
    const result = validateProfile({ ...base, fullName: "a".repeat(81) }, { requireConsent: true });
    expect(result.ok).toBe(false);
  });
});

describe("needsConsent", () => {
  it("pide la autorización si no hay perfil o si es de otra versión", () => {
    expect(needsConsent(null)).toBe(true);
    expect(needsConsent({ data_policy_version: "vieja" })).toBe(true);
    expect(needsConsent({ data_policy_version: null })).toBe(true);
    expect(needsConsent({ data_policy_version: DATA_POLICY_VERSION })).toBe(false);
  });
});
