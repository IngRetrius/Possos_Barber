import { describe, expect, it } from "vitest";
import { searchTerm, validateStaffCustomer, whatsappChatUrl } from "./staff";

describe("validateStaffCustomer", () => {
  it("pide nombre, celular y la autorización", () => {
    const result = validateStaffCustomer({
      fullName: "",
      phone: "123",
      dataConsent: false,
      whatsappOptIn: false,
    });
    expect(result).toEqual({
      ok: false,
      errors: {
        fullName: "Escribe el nombre del cliente",
        phone: "El celular debe tener 10 dígitos, sin el +57",
        dataConsent: "Sin la autorización del cliente no podemos guardar sus datos",
      },
    });
  });

  it("deja el celular en E.164", () => {
    expect(
      validateStaffCustomer({
        fullName: "  Carlos   Ruiz ",
        phone: "300 123 4567",
        dataConsent: true,
        whatsappOptIn: true,
      }),
    ).toEqual({
      ok: true,
      data: { fullName: "Carlos Ruiz", phoneE164: "+573001234567", whatsappOptIn: true },
    });
  });
});

describe("searchTerm", () => {
  it("quita lo que cambiaría el filtro", () => {
    expect(searchTerm("ana),phone.eq.(1")).toBe("ana phone eq 1");
    expect(searchTerm("%_*")).toBe("");
  });

  it("junta los dígitos de un celular", () => {
    expect(searchTerm("300 123 4567")).toBe("3001234567");
    expect(searchTerm("+57 300 123 4567")).toBe("3001234567");
  });
});

describe("whatsappChatUrl", () => {
  it("arma el enlace sin el +", () => {
    expect(whatsappChatUrl("+573001234567")).toBe("https://wa.me/573001234567");
    expect(whatsappChatUrl(null)).toBeNull();
  });
});
