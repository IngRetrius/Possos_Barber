import { describe, expect, it } from "vitest";
import { groupServices, pickAddons, serviceLabel, withAddons } from "./addons";

const corte = { price_cop: 25000, duration_min: 60 };
const barba = { id: "b", price_cop: 15000, duration_min: 60 };
const cejas = { id: "c", price_cop: 5000, duration_min: 0 };
const diseno = { id: "d", price_cop: 5000, duration_min: 0 };

describe("adicionales", () => {
  it("suman precio y minutos como los combos de Beunik", () => {
    expect(withAddons(corte, [])).toEqual({ priceCop: 25000, durationMin: 60 });
    expect(withAddons(corte, [cejas])).toEqual({ priceCop: 30000, durationMin: 60 });
    expect(withAddons(corte, [cejas, diseno])).toEqual({ priceCop: 35000, durationMin: 60 });
    expect(withAddons(corte, [barba])).toEqual({ priceCop: 40000, durationMin: 120 });
    expect(withAddons(corte, [barba, cejas])).toEqual({ priceCop: 45000, durationMin: 120 });
    // Combinaciones nuevas (decisión del 20/11/2026).
    expect(withAddons(corte, [barba, diseno])).toEqual({ priceCop: 45000, durationMin: 120 });
    expect(withAddons(corte, [barba, cejas, diseno])).toEqual({
      priceCop: 50000,
      durationMin: 120,
    });
  });

  it("deja el total [PENDIENTE] si falta un precio", () => {
    expect(withAddons({ price_cop: null, duration_min: 60 }, [cejas]).priceCop).toBeNull();
    expect(withAddons(corte, [{ price_cop: null, duration_min: 0 }]).priceCop).toBeNull();
  });

  it("nombra el servicio con sus adicionales", () => {
    expect(serviceLabel("Corte")).toBe("Corte");
    expect(serviceLabel("Corte", ["Barba", "Cejas"])).toBe("Corte + Barba + Cejas");
  });

  it("toma solo los adicionales que existen, en su orden y sin repetir", () => {
    expect(pickAddons([barba, cejas, diseno], ["d", "x", "b", "d"])).toEqual([barba, diseno]);
  });

  it("agrupa por categoría donde aparece el primero y junta los sin grupo seguidos", () => {
    const s = (name: string, category: string | null) => ({ name, category });
    const groups = groupServices([
      s("Corte", null),
      s("Domicilio", null),
      s("Rayos", "Color de cabello"),
      s("Otro", null),
      s("Global", "Color de cabello "),
    ]);
    expect(groups.map((g) => [g.category, g.services.map((x) => x.name)])).toEqual([
      [null, ["Corte", "Domicilio"]],
      ["Color de cabello", ["Rayos", "Global"]],
      [null, ["Otro"]],
    ]);
  });
});
