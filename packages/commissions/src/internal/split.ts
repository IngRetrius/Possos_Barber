import { DEFAULT_LOCALE, type Locale } from "@possos/config/constants";
/*
 * Reparto de un cobro y periodos de la liquidación (docs/11). No importa ./index para que
 * dependency-cruiser no vea un ciclo.
 */

/**
 * Lo mismo que calculan las columnas generadas de `charges`:
 * `barber = round(amount * pct / 100)` y la barbería el resto, así que siempre suman lo cobrado.
 * Postgres redondea .5 hacia arriba en positivos, igual que `Math.round`.
 */
export function splitAmount(
  amountCop: number,
  barberPct: number,
): { barber: number; business: number } {
  const barber = Math.round((amountCop * barberPct) / 100);
  return { barber, business: amountCop - barber };
}

/** "50 %", "45,5 %" en español; "50%", "45.5%" en inglés. */
export function formatPercent(pct: number, locale: Locale = DEFAULT_LOCALE): string {
  const value = String(Math.round(pct * 100) / 100);
  return locale === "en" ? `${value}%` : `${value.replace(".", ",")} %`;
}

export type SettlementPeriod = "hoy" | "semana" | "quincena" | "mes" | "rango";

/** Periodos de la liquidación, en orden. El nombre está en `commissions.periods`. */
export const SETTLEMENT_PERIODS: SettlementPeriod[] = ["hoy", "semana", "quincena", "mes", "rango"];

function shift(day: string, days: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function lastDayOfMonth(day: string): string {
  const [y, m] = day.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

/**
 * Días de Bogotá (`YYYY-MM-DD`, ambos incluidos) de un periodo que contiene `today`. La semana
 * va de lunes a domingo; la quincena, del 1 al 15 o del 16 al último día del mes.
 */
export function periodRange(
  period: Exclude<SettlementPeriod, "rango">,
  today: string,
): { from: string; to: string } {
  if (period === "hoy") return { from: today, to: today };
  if (period === "semana") {
    const weekday = new Date(`${today}T12:00:00Z`).getUTCDay() || 7;
    const monday = shift(today, 1 - weekday);
    return { from: monday, to: shift(monday, 6) };
  }
  const monthStart = `${today.slice(0, 8)}01`;
  if (period === "mes") return { from: monthStart, to: lastDayOfMonth(today) };
  return Number(today.slice(8)) <= 15
    ? { from: monthStart, to: `${today.slice(0, 8)}15` }
    : { from: `${today.slice(0, 8)}16`, to: lastDayOfMonth(today) };
}
