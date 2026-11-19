import { describe, expect, it } from "vitest";
import { parsePeriod } from "./period";

describe("parsePeriod", () => {
  it("lee el tstzrange que devuelve PostgREST", () => {
    expect(parsePeriod('["2026-11-20 20:00:00+00","2026-11-20 21:00:00+00")')).toEqual({
      start: "2026-11-20T20:00:00.000Z",
      end: "2026-11-20T21:00:00.000Z",
    });
  });

  it("acepta fracciones de segundo y otras zonas", () => {
    expect(parsePeriod('["2026-11-20 15:00:00.5-05","2026-11-20 16:00:00-05")')).toEqual({
      start: "2026-11-20T20:00:00.500Z",
      end: "2026-11-20T21:00:00.000Z",
    });
  });

  it("devuelve null si no es un rango", () => {
    expect(parsePeriod("empty")).toBeNull();
    expect(parsePeriod("")).toBeNull();
    expect(parsePeriod('["no es fecha","tampoco")')).toBeNull();
    expect(parsePeriod(null)).toBeNull();
    expect(parsePeriod(42)).toBeNull();
  });
});
