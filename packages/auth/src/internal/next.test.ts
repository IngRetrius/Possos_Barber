import { describe, expect, it } from "vitest";
import { safeNext, withNext } from "./next";

describe("safeNext", () => {
  it.each([
    ["/perfil", "/perfil"],
    [
      "/reservar?servicio=1&hora=2026-11-20T15%3A00",
      "/reservar?servicio=1&hora=2026-11-20T15%3A00",
    ],
    ["/reservar#confirmar", "/reservar#confirmar"],
    ["  /panel  ", "/panel"],
    ["/", "/"],
    ["/nueva-contrasena", "/nueva-contrasena"],
  ])("acepta la ruta interna %j", (value, expected) => {
    expect(safeNext(value)).toBe(expected);
  });

  it.each([
    ["//otro.com"],
    ["//otro.com/perfil"],
    ["/\\otro.com"],
    ["/\t/otro.com"],
    ["/\n/otro.com"],
    ["https://otro.com/perfil"],
    ["http:otro.com"],
    ["javascript:alert(1)"],
    ["perfil"],
    [""],
    ["   "],
    [`/${"a".repeat(2100)}`],
  ])("rechaza %j", (value) => {
    expect(safeNext(value)).toBeNull();
  });

  it("rechaza lo que no es texto", () => {
    expect(safeNext(null)).toBeNull();
    expect(safeNext(undefined)).toBeNull();
    expect(safeNext(["/perfil"])).toBeNull();
    expect(safeNext(42)).toBeNull();
  });

  it.each([["/ingresar"], ["/ingresar?next=/perfil"], ["/registrarse"], ["/auth/callback"]])(
    "no vuelve a una ruta de ingreso (%j)",
    (value) => {
      expect(safeNext(value)).toBeNull();
    },
  );

  it("no confunde una ruta que solo empieza igual", () => {
    expect(safeNext("/ingresarlo")).toBe("/ingresarlo");
    expect(safeNext("/authors")).toBe("/authors");
  });

  describe("con origen (el enlace del correo)", () => {
    const origin = "https://possos.example";

    it("acepta una URL absoluta del mismo origen", () => {
      expect(safeNext("https://possos.example/reservar?servicio=1", origin)).toBe(
        "/reservar?servicio=1",
      );
    });

    it("rechaza otro origen, otro esquema u otro puerto", () => {
      expect(safeNext("https://otro.example/perfil", origin)).toBeNull();
      expect(safeNext("http://possos.example/perfil", origin)).toBeNull();
      expect(safeNext("https://possos.example:8443/perfil", origin)).toBeNull();
      expect(safeNext("https://possos.example.otro.com/perfil", origin)).toBeNull();
    });

    it("sigue aceptando rutas relativas", () => {
      expect(safeNext("/perfil", origin)).toBe("/perfil");
    });

    it("sin origen, no acepta URL absolutas aunque sean del sitio", () => {
      expect(safeNext("https://possos.example/perfil")).toBeNull();
    });
  });
});

describe("withNext", () => {
  it("agrega next codificado", () => {
    expect(withNext("/ingresar", "/reservar?servicio=1&hora=3")).toBe(
      "/ingresar?next=%2Freservar%3Fservicio%3D1%26hora%3D3",
    );
  });

  it("respeta una consulta que ya exista", () => {
    expect(withNext("/ingresar?aviso=1", "/perfil")).toBe("/ingresar?aviso=1&next=%2Fperfil");
  });

  it("no agrega nada si next no es seguro o no existe", () => {
    expect(withNext("/ingresar", "//otro.com")).toBe("/ingresar");
    expect(withNext("/ingresar", null)).toBe("/ingresar");
    expect(withNext("/ingresar", undefined)).toBe("/ingresar");
  });
});
