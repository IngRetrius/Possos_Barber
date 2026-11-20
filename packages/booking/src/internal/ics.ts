/*
 * "Agregar al calendario" (docs/04): el archivo .ics de una cita y el enlace que abre Google
 * Calendar con la cita ya llena. Sin dependencias: el .ics es texto (RFC 5545).
 */

export interface IcsEvent {
  /** Id de la cita: el calendario la reconoce si se agrega dos veces. */
  id: string;
  start: string | Date;
  end: string | Date;
  title: string;
  description?: string | null;
  location?: string | null;
  url?: string | null;
  /** Aviso del calendario antes de la cita, en minutos. */
  alarmMinutes?: number;
  /** Hora en que se genera el archivo (DTSTAMP). */
  now?: Date;
}

/** `20261120T200000Z` */
function stamp(value: string | Date): string {
  return new Date(value)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/** Escapa un texto según RFC 5545: barra, punto y coma, coma y saltos de línea. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Parte las líneas de más de 75 octetos (RFC 5545, 3.1) sin cortar un carácter UTF-8. */
function fold(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74; // las de continuación empiezan con un espacio
    if (size + bytes > limit) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += char;
    size += bytes;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function appointmentIcs(event: IcsEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Possos Barber//Reservas//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@possosbarber`,
    `DTSTAMP:${stamp(event.now ?? new Date())}`,
    `DTSTART:${stamp(event.start)}`,
    `DTEND:${stamp(event.end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ];
  if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  if (event.url) lines.push(`URL:${event.url}`);
  if (event.alarmMinutes && event.alarmMinutes > 0) {
    lines.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeIcsText(event.title)}`,
      `TRIGGER:-PT${Math.round(event.alarmMinutes)}M`,
      "END:VALARM",
    );
  }
  lines.push("END:VEVENT", "END:VCALENDAR");
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

/**
 * Enlace de Google Calendar con el evento listo para guardar. Las horas van en UTC, como en el
 * .ics. Google no recibe el aviso: el evento usa los recordatorios por omisión de la cuenta.
 */
export function googleCalendarUrl(event: IcsEvent): string {
  const details = [event.description, event.url].filter(Boolean).join("\n\n");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${stamp(event.start)}/${stamp(event.end)}`,
  });
  if (details) params.set("details", details);
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Qué calendario abre "Agregar al calendario". En iPhone, iPad y Mac, Safari abre el .ics
 * directo en Calendario. En Android el .ics solo se descarga (Google Calendar no lo importa
 * desde el celular), así que ahí y en lo demás va a Google Calendar. El iPad se presenta como Mac.
 */
export function calendarTarget(userAgent: string | null): "ics" | "google" {
  return userAgent && /iPhone|iPad|iPod|Macintosh/.test(userAgent) ? "ics" : "google";
}
