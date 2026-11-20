/**
 * Lo que el panel muestra de los mensajes de WhatsApp de una cita (docs/11, "Detalle de una
 * cita") y el costo estimado del mes en "Más". Puro, sin red ni base, para Vitest.
 */

/** Las columnas de message_jobs que usa el resumen. */
export interface MessageJobView {
  channel: string;
  kind: string;
  template: string | null;
  status: string;
  send_at: string;
  sent_at: string | null;
  status_at: string | null;
  last_error: string | null;
}

export type MessageKind = "confirmation" | "reminder" | "cancellation";

export type MessageState = "scheduled" | "sending" | "sent" | "delivered" | "read" | "failed";

export interface ReminderSummary {
  /** El último mensaje que se intentó mandar, o null si todavía no sale ninguno. */
  last: {
    kind: MessageKind;
    state: Exclude<MessageState, "scheduled">;
    /** Hora del último estado (o del envío). */
    at: string | null;
    /** Falló por el número (no tiene WhatsApp, mal escrito): "revisa el número". */
    phoneProblem: boolean;
  } | null;
  /** El próximo programado. */
  next: { kind: MessageKind; at: string } | null;
}

/**
 * Errores de Meta que apuntan al número del cliente: 131026 (no se pudo entregar: sin WhatsApp o
 * número equivocado), 131021 (el destinatario es el mismo número) y 131030 (fuera de la lista de
 * números de prueba, mientras se usa el número de prueba de Meta).
 */
const PHONE_ERROR_CODES = new Set([131026, 131021, 131030]);

export function errorCodeOf(lastError: string | null): number | null {
  const match = /^(\d+):/.exec(lastError ?? "");
  return match ? Number(match[1]) : null;
}

function kindOf(kind: string): MessageKind {
  return kind === "confirmation" || kind === "cancellation" ? kind : "reminder";
}

/** null si la cita no tiene mensajes de WhatsApp (o todos se descartaron). */
export function reminderSummary(jobs: MessageJobView[]): ReminderSummary | null {
  const whatsapp = jobs.filter((j) => j.channel === "whatsapp" && j.status !== "skipped");
  if (whatsapp.length === 0) return null;

  const byTime = (j: MessageJobView) => new Date(j.sent_at ?? j.send_at).getTime();
  const tried = whatsapp
    .filter((j) => j.status !== "scheduled")
    .sort((a, b) => byTime(b) - byTime(a))[0];
  const next = whatsapp
    .filter((j) => j.status === "scheduled")
    .sort((a, b) => new Date(a.send_at).getTime() - new Date(b.send_at).getTime())[0];

  return {
    last: tried
      ? {
          kind: kindOf(tried.kind),
          state: tried.status as Exclude<MessageState, "scheduled">,
          at: tried.status_at ?? tried.sent_at,
          phoneProblem:
            tried.status === "failed" && PHONE_ERROR_CODES.has(errorCodeOf(tried.last_error) ?? 0),
        }
      : null,
    next: next ? { kind: kindOf(next.kind), at: next.send_at } : null,
  };
}

/** Si la agenda marca la cita: el último mensaje falló. */
export function reminderFailed(summary: ReminderSummary | null): boolean {
  return summary?.last?.state === "failed";
}

// ---------------------------------------------------------------------------------------------
// Costo del mes
// ---------------------------------------------------------------------------------------------

/**
 * Precio aproximado por mensaje entregado en Colombia, en pesos (docs/03, investigado el
 * 18/11/2026 en sitios que copian la tabla de Meta: utilidad US$0,0008 y marketing US$0,0125).
 * **Falta confirmarlo con la tabla oficial en COP de Meta** (riesgo 3 de docs/10). Cuando esté,
 * se cambia aquí.
 */
export const WHATSAPP_PRICE_COP = { utility: 3, marketing: 46 } as const;

export interface WhatsappUsage {
  /** Mensajes que la Cloud API aceptó en el periodo. */
  accepted: number;
  /** Entregados o leídos: los que Meta cobra. */
  delivered: number;
  /** De los entregados, los que Meta cobró como marketing (plantilla reclasificada). */
  marketing: number;
  /** Los que fallaron. */
  failed: number;
}

/** Costo estimado en pesos: Meta cobra por mensaje de plantilla entregado, según su categoría. */
export function whatsappCostEstimate(usage: WhatsappUsage): number {
  const marketing = Math.min(usage.marketing, usage.delivered);
  return (
    (usage.delivered - marketing) * WHATSAPP_PRICE_COP.utility +
    marketing * WHATSAPP_PRICE_COP.marketing
  );
}
