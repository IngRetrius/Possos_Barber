import { describe, expect, it } from "vitest";
import { appointmentIcs, calendarTarget, escapeIcsText, googleCalendarUrl } from "./ics";

describe("appointmentIcs", () => {
  const ics = appointmentIcs({
    id: "ad000000-0000-0000-0000-000000000001",
    start: "2026-11-20T20:00:00.000Z",
    end: "2026-11-20T21:00:00.000Z",
    title: "Corte normal en Possos Barber",
    description: "Con Barbero de prueba. Puedes cancelar o cambiar tu cita hasta 2 horas antes.",
    url: "https://possos-web.vercel.app",
    alarmMinutes: 60,
    now: new Date("2026-11-19T12:00:00Z"),
  });
  const lines = ics.split("\r\n");

  it("usa CRLF y termina con uno", () => {
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/\n/);
  });

  it("lleva las horas en UTC", () => {
    expect(lines).toContain("DTSTART:20261120T200000Z");
    expect(lines).toContain("DTEND:20261120T210000Z");
    expect(lines).toContain("DTSTAMP:20261119T120000Z");
  });

  it("convierte la hora de Bogotá a UTC y termina cuando termina la cita", () => {
    const bogota = appointmentIcs({
      id: "x",
      // 7:00 p. m. a 8:30 p. m. en Bogotá: en UTC ya es el día siguiente.
      start: "2026-11-20T19:00:00-05:00",
      end: "2026-11-20T20:30:00-05:00",
      title: "Corte",
      now: new Date("2026-11-19T12:00:00Z"),
    }).split("\r\n");
    expect(bogota).toContain("DTSTART:20261121T000000Z");
    expect(bogota).toContain("DTEND:20261121T013000Z");
  });

  it("escapa la dirección", () => {
    const withAddress = appointmentIcs({
      id: "x",
      start: "2026-11-20T20:00:00.000Z",
      end: "2026-11-20T21:00:00.000Z",
      title: "Corte",
      location: "Manzana 26 Casa 13, barrio Kennedy, Girardot",
      now: new Date("2026-11-19T12:00:00Z"),
    }).split("\r\n");
    expect(withAddress).toContain("LOCATION:Manzana 26 Casa 13\\, barrio Kennedy\\, Girardot");
  });

  it("identifica la cita y avisa una hora antes", () => {
    expect(lines).toContain("UID:ad000000-0000-0000-0000-000000000001@possosbarber");
    expect(lines).toContain("TRIGGER:-PT60M");
  });

  it("parte las líneas largas en 75 octetos", () => {
    for (const line of lines) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    const unfolded = ics.replace(/\r\n /g, "");
    expect(unfolded).toContain(
      "DESCRIPTION:Con Barbero de prueba. Puedes cancelar o cambiar tu cita hasta 2 horas antes.",
    );
  });

  it("no parte un carácter de varios octetos", () => {
    const long = appointmentIcs({
      id: "x",
      start: "2026-11-20T20:00:00.000Z",
      end: "2026-11-20T21:00:00.000Z",
      title: "ñ".repeat(80),
    });
    const unfolded = long.replace(/\r\n /g, "");
    expect(unfolded).toContain(`SUMMARY:${"ñ".repeat(80)}`);
  });
});

describe("escapeIcsText", () => {
  it("escapa comas, punto y coma, barras y saltos de línea", () => {
    expect(escapeIcsText("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
  });
});

describe("googleCalendarUrl", () => {
  const url = new URL(
    googleCalendarUrl({
      id: "x",
      start: "2026-11-21T00:00:00.000Z",
      end: "2026-11-21T01:00:00.000Z",
      title: "Corte normal en Possos Barber",
      description: "Con Barbero de prueba.",
      location: "Calle 1, Girardot",
      url: "https://possos-web.vercel.app/mis-citas/x",
    }),
  );

  it("abre el formulario de evento de Google Calendar", () => {
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
  });

  it("lleva las horas en UTC y los datos de la cita", () => {
    expect(url.searchParams.get("dates")).toBe("20261121T000000Z/20261121T010000Z");
    expect(url.searchParams.get("text")).toBe("Corte normal en Possos Barber");
    expect(url.searchParams.get("location")).toBe("Calle 1, Girardot");
    expect(url.searchParams.get("details")).toBe(
      "Con Barbero de prueba.\n\nhttps://possos-web.vercel.app/mis-citas/x",
    );
  });
});

describe("calendarTarget", () => {
  it("usa el .ics en iPhone, iPad y Mac", () => {
    expect(
      calendarTarget("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15"),
    ).toBe("ics");
    expect(
      calendarTarget("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15"),
    ).toBe("ics");
  });

  it("usa Google Calendar en Android, en lo demás y sin user agent", () => {
    expect(
      calendarTarget("Mozilla/5.0 (Linux; Android 14; SM-A146M) AppleWebKit/537.36 Chrome/130"),
    ).toBe("google");
    expect(calendarTarget("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130")).toBe("google");
    expect(calendarTarget(null)).toBe("google");
  });
});
