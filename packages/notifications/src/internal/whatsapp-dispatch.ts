import type { WhatsAppClient } from "./whatsapp-client";
import { ACTIVE_STATUSES, type JobKind } from "./whatsapp-consumer";
import {
  isTemplateName,
  templateMessage,
  type MessageContext,
  type WhatsappAppointment,
} from "./whatsapp-templates";

/** Intentos por trabajo, contando el primero. */
export const MAX_ATTEMPTS = 5;
/** Espera antes de cada reintento, en minutos: 1, 5, 15 y 30 (en total, unos 51 minutos). */
export const RETRY_DELAYS_MIN = [1, 5, 15, 30];
/** Trabajos por tanda. Cada envío espera 10 s como máximo y la ruta tiene 60 s. */
export const DISPATCH_BATCH = 10;
/** Tandas por despacho; lo que quede lo toma el siguiente (pg_cron, cada minuto). */
export const DISPATCH_ROUNDS = 3;

/** Un trabajo que `claim_message_jobs` pasó a `sending` (ya con el intento sumado). */
export interface ClaimedJob {
  id: string;
  appointment_id: string;
  kind: JobKind | string;
  template: string | null;
  attempts: number;
}

export type JobOutcome =
  | { outcome: "sent"; messageId: string }
  | { outcome: "retry"; at: Date; error: string }
  | { outcome: "failed"; error: string }
  | { outcome: "skipped"; reason: string };

export interface JobStore {
  /** null si la base falló. */
  claim: (limit: number) => Promise<ClaimedJob[] | null>;
  /** false si la fila ya no estaba en `sending` (otro despacho la retomó) o la base falló. */
  finish: (id: string, outcome: JobOutcome) => Promise<boolean>;
}

export interface DispatchDueDeps {
  jobs: JobStore;
  loadAppointment: (id: string) => Promise<WhatsappAppointment | null | "error">;
  /** null si faltan el token o el número: los trabajos vencidos se descartan (`NOT_CONFIGURED`). */
  client: WhatsAppClient | null;
  context: MessageContext;
  now?: () => Date;
  log?: (message: string, detail?: unknown) => void;
}

export interface DueReport {
  sent: number;
  retried: number;
  failed: number;
  skipped: number;
  error?: "CLAIM_FAILED";
}

/**
 * Manda los trabajos de WhatsApp vencidos (F7). `claim` los toma con `for update skip locked` y
 * los pasa a `sending`: si dos despachos corren a la vez, cada trabajo lo manda uno solo. Justo
 * antes de mandar, vuelve a leer la cita (docs/09): una cita cancelada, movida o pasada no recibe
 * el mensaje, ni un cliente que dejó de aceptar WhatsApp.
 */
export async function dispatchDue(deps: DispatchDueDeps): Promise<DueReport> {
  const now = deps.now ?? (() => new Date());
  const log = deps.log ?? (() => {});
  const report: DueReport = { sent: 0, retried: 0, failed: 0, skipped: 0 };

  const finish = async (job: ClaimedJob, outcome: JobOutcome) => {
    const saved = await deps.jobs.finish(job.id, outcome);
    if (!saved) log(`No se pudo cerrar el trabajo ${job.id} (${outcome.outcome})`);
    if (outcome.outcome === "sent") report.sent++;
    else if (outcome.outcome === "retry") report.retried++;
    else if (outcome.outcome === "failed") report.failed++;
    else report.skipped++;
  };

  /** Reintenta si quedan intentos y alcanza antes de la cita; si no, falla. */
  const retryOrFail = (job: ClaimedJob, error: string, startAt: string | null): JobOutcome => {
    const delay = RETRY_DELAYS_MIN[Math.min(job.attempts, RETRY_DELAYS_MIN.length) - 1] ?? 30;
    const at = new Date(now().getTime() + delay * 60_000);
    const beforeStart = startAt === null || at.getTime() < new Date(startAt).getTime();
    return job.attempts < MAX_ATTEMPTS && beforeStart
      ? { outcome: "retry", at, error }
      : { outcome: "failed", error };
  };

  const handleJob = async (job: ClaimedJob): Promise<void> => {
    if (!deps.client) return finish(job, { outcome: "skipped", reason: "NOT_CONFIGURED" });
    if (!isTemplateName(job.template)) {
      return finish(job, { outcome: "skipped", reason: "NO_TEMPLATE" });
    }

    let appointment: WhatsappAppointment | null | "error";
    try {
      appointment = await deps.loadAppointment(job.appointment_id);
    } catch {
      appointment = "error";
    }
    if (appointment === "error") return finish(job, retryOrFail(job, "DB_ERROR", null));
    if (!appointment) return finish(job, { outcome: "skipped", reason: "NOT_FOUND" });

    if (new Date(appointment.start_at).getTime() <= now().getTime()) {
      return finish(job, { outcome: "skipped", reason: "TOO_LATE" });
    }
    const active =
      job.kind === "cancellation"
        ? appointment.status === "cancelled"
        : ACTIVE_STATUSES.includes(appointment.status);
    if (!active) return finish(job, { outcome: "skipped", reason: "INACTIVE" });
    if (!appointment.whatsapp_opt_in)
      return finish(job, { outcome: "skipped", reason: "OPTED_OUT" });
    if (!appointment.customer_phone) return finish(job, { outcome: "skipped", reason: "NO_PHONE" });

    let result;
    try {
      result = await deps.client.sendTemplate(
        appointment.customer_phone,
        templateMessage(job.template, appointment, deps.context),
      );
    } catch (error) {
      log(`El envío del trabajo ${job.id} lanzó`, error);
      result = { ok: false as const, retryable: true, error: "NETWORK" };
    }
    if (result.ok) return finish(job, { outcome: "sent", messageId: result.messageId });
    log(`WhatsApp rechazó el trabajo ${job.id}`, result.error);
    return finish(
      job,
      result.retryable
        ? retryOrFail(job, result.error, appointment.start_at)
        : { outcome: "failed", error: result.error },
    );
  };

  for (let round = 0; round < DISPATCH_ROUNDS; round++) {
    const jobs = await deps.jobs.claim(DISPATCH_BATCH);
    if (jobs === null) return { ...report, error: "CLAIM_FAILED" };
    await Promise.all(jobs.map(handleJob));
    if (jobs.length < DISPATCH_BATCH) break;
  }
  return report;
}
