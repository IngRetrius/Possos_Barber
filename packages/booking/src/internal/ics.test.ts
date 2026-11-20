import { describe, expect, it } from "vitest";
import { appointmentIcs, escapeIcsText } from "./ics";

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
