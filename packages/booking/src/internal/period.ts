/**
 * `appointments.period` llega de PostgREST como texto de un tstzrange:
 * `["2026-11-20 20:00:00+00","2026-11-20 21:00:00+00")`. Esto lo convierte en dos instantes ISO.
 */
export function parsePeriod(period: unknown): { start: string; end: string } | null {
  if (typeof period !== "string") return null;
  const match = /^[[(]"?([^",]+)"?,"?([^",)\]]+)"?[)\]]$/.exec(period.trim());
  if (!match) return null;
  const start = toIso(match[1]!);
  const end = toIso(match[2]!);
  return start && end ? { start, end } : null;
}

function toIso(value: string): string | null {
  // "2026-11-20 20:00:00+00" → "2026-11-20T20:00:00+00:00", que todos los motores entienden.
  const normalized = value
    .trim()
    .replace(" ", "T")
    .replace(/([+-]\d{2})$/, "$1:00");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
