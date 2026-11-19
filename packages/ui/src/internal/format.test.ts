import { afterEach, describe, expect, it } from "vitest";
import {
  dayPeriod,
  formatDate,
  formatDateLong,
  formatDuration,
  formatMonthYear,
  formatPrice,
  formatTime,
  formatTimeRange,
  formatTimeShort,
  toDateKey,
} from "./format";

/** Los textos usan espacio que no se parte; en las pruebas se escribe con espacio normal. */
const plain = (s: string) => s.replaceAll(" ", " ");

describe("fechas", () => {
  it("formatea el día corto y largo en Bogotá", () => {
    // 19/11/2026, 3:00 p. m. en Bogotá (UTC-5).
    expect(formatDate("2026-11-19T20:00:00Z")).toBe("jue 19 nov");
    expect(formatDateLong("2026-11-19T20:00:00Z")).toBe("jueves 19 de noviembre");
    expect(formatMonthYear("2026-11-19T20:00:00Z")).toBe("noviembre 2026");
  });

  it("usa el día de Bogotá aunque en UTC ya sea el siguiente", () => {
    expect(formatDate("2026-11-20T04:59:00Z")).toBe("jue 19 nov");
    expect(toDateKey("2026-11-20T04:59:00Z")).toBe("2026-11-19");
    expect(formatDate("2026-11-20T05:00:00Z")).toBe("vie 20 nov");
  });

  it("toma un YYYY-MM-DD como ese día del calendario, no como medianoche UTC", () => {
    expect(formatDate("2026-11-20")).toBe("vie 20 nov");
    expect(formatDateLong("2026-11-23")).toBe("lunes 23 de noviembre");
    expect(toDateKey("2026-11-20")).toBe("2026-11-20");
  });

  it("cambia de mes y de año", () => {
    expect(formatDate("2026-12-01T03:00:00Z")).toBe("lun 30 nov");
    expect(formatDate("2026-12-01T05:00:00Z")).toBe("mar 1 dic");
    expect(formatMonthYear("2026-12-01T05:00:00Z")).toBe("diciembre 2026");
    expect(formatDate("2027-01-01T04:00:00Z")).toBe("jue 31 dic");
    expect(formatMonthYear("2027-01-01T05:00:00Z")).toBe("enero 2027");
  });

  it("escribe los nombres largos igual que Intl en es-CO", () => {
    for (let month = 0; month < 12; month++) {
      const date = new Date(Date.UTC(2026, month, 15, 17));
      const intl = new Intl.DateTimeFormat("es-CO", {
        timeZone: "America/Bogota",
        month: "long",
      }).format(date);
      expect(formatMonthYear(date)).toBe(`${intl} 2026`);
    }
    for (let day = 15; day < 22; day++) {
      const date = new Date(Date.UTC(2026, 10, day, 17));
      const intl = new Intl.DateTimeFormat("es-CO", {
        timeZone: "America/Bogota",
        weekday: "long",
      }).format(date);
      expect(formatDateLong(date).startsWith(`${intl} `)).toBe(true);
    }
  });

  it("rechaza fechas no válidas", () => {
    expect(() => formatDate("mañana")).toThrow(RangeError);
  });
});

describe("horas", () => {
  it("formatea con a. m. y p. m.", () => {
    expect(plain(formatTime("2026-11-19T20:00:00Z"))).toBe("3:00 p. m.");
    expect(plain(formatTime("2026-11-19T14:30:00Z"))).toBe("9:30 a. m.");
    expect(formatTimeShort("2026-11-19T20:00:00Z")).toBe("3:00");
  });

  it("no parte la hora entre líneas", () => {
    expect(formatTime("2026-11-19T20:00:00Z")).toBe("3:00 p. m.");
  });

  it("medianoche es 12:00 a. m. del día que empieza", () => {
    expect(plain(formatTime("2026-11-20T05:00:00Z"))).toBe("12:00 a. m.");
    expect(formatTimeShort("2026-11-20T05:00:00Z")).toBe("12:00");
    expect(plain(formatTime("2026-11-20T04:59:00Z"))).toBe("11:59 p. m.");
  });

  it("mediodía es 12:00 p. m.", () => {
    expect(plain(formatTime("2026-11-19T17:00:00Z"))).toBe("12:00 p. m.");
    expect(plain(formatTime("2026-11-19T16:59:00Z"))).toBe("11:59 a. m.");
  });

  it("formatea un rango", () => {
    expect(plain(formatTimeRange("2026-11-19T20:00:00Z", "2026-11-19T21:00:00Z"))).toBe(
      "3:00 p. m. a 4:00 p. m.",
    );
  });

  it("agrupa en mañana, tarde y noche", () => {
    expect(dayPeriod("2026-11-19T16:59:00Z")).toBe("morning"); // 11:59 a. m.
    expect(dayPeriod("2026-11-19T17:00:00Z")).toBe("afternoon"); // 12:00 p. m.
    expect(dayPeriod("2026-11-19T22:59:00Z")).toBe("afternoon"); // 5:59 p. m.
    expect(dayPeriod("2026-11-19T23:00:00Z")).toBe("evening"); // 6:00 p. m.
    expect(dayPeriod("2026-11-20T05:00:00Z")).toBe("morning"); // medianoche
  });
});

describe("zona horaria del equipo", () => {
  const original = process.env.TZ;
  afterEach(() => {
    process.env.TZ = original;
  });

  it("da el mismo texto en un servidor con otra zona", () => {
    process.env.TZ = "Asia/Tokyo";
    expect(formatDate("2026-11-20T04:59:00Z")).toBe("jue 19 nov");
    expect(plain(formatTime("2026-11-20T04:59:00Z"))).toBe("11:59 p. m.");
    expect(formatDate("2026-11-20")).toBe("vie 20 nov");
  });
});

describe("precios y duraciones", () => {
  it("formatea pesos con punto de miles y sin decimales", () => {
    expect(formatPrice(35000)).toBe("$35.000");
    expect(formatPrice(5000)).toBe("$5.000");
    expect(formatPrice(999)).toBe("$999");
    expect(formatPrice(0)).toBe("$0");
    expect(formatPrice(1234567)).toBe("$1.234.567");
    expect(formatPrice(35000.4)).toBe("$35.000");
    expect(formatPrice(-5000)).toBe("-$5.000");
  });

  it("rechaza un precio que no es número", () => {
    expect(() => formatPrice(Number.NaN)).toThrow(RangeError);
  });

  it("formatea minutos", () => {
    expect(plain(formatDuration(60))).toBe("60 min");
  });
});
