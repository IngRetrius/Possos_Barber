import webpush, { WebPushError } from "web-push";
import type { PushMessage } from "./push-message";

/**
 * Web Push con claves VAPID (docs/07). Sin costo por mensaje. La clave privada vive solo en
 * las variables de entorno de Vercel y en apps/web/.env.local (regla 6).
 */
export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  /** Contacto para el servicio de push (Apple exige `https:` o `mailto:`). */
  subject: string;
}

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface SendReport {
  sent: number;
  /** Suscripciones que el servicio de push dio por muertas (404 o 410): se borran. */
  gone: string[];
  failed: number;
}

export type PushSender = (targets: PushTarget[], message: PushMessage) => Promise<SendReport>;

/** Lee las claves del entorno. null si faltan: entonces no se manda ningún push. */
export function vapidFromEnv(subject: string): VapidConfig | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

/** 12 horas: si el celular estuvo apagado más, el aviso ya no sirve. */
const TTL_SECONDS = 12 * 60 * 60;

export function webPushSender(
  vapid: VapidConfig,
  log: (message: string, detail?: unknown) => void = () => {},
): PushSender {
  return async (targets, message) => {
    const report: SendReport = { sent: 0, gone: [], failed: 0 };
    const payload = JSON.stringify(message);
    await Promise.all(
      targets.map(async (target) => {
        try {
          await webpush.sendNotification(
            { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
            payload,
            { vapidDetails: vapid, TTL: TTL_SECONDS, urgency: "high" },
          );
          report.sent++;
        } catch (error) {
          if (
            error instanceof WebPushError &&
            (error.statusCode === 404 || error.statusCode === 410)
          ) {
            report.gone.push(target.endpoint);
            return;
          }
          report.failed++;
          // Sin el endpoint: identifica el celular de la persona.
          log(
            "No se pudo enviar un push",
            error instanceof WebPushError ? error.statusCode : error,
          );
        }
      }),
    );
    return report;
  };
}
