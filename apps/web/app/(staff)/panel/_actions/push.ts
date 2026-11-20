"use server";

import {
  deletePushSubscription,
  savePushSubscription,
  sendTestPush,
  vapidFromEnv,
} from "@possos/notifications/server";
import { pushSubject } from "../../../../lib/business";
import { loadPanel } from "../../../../lib/panel";
import { getTranslations } from "next-intl/server";
import { currentLocale } from "../../../../lib/i18n";

/** Textos de las acciones del panel, en el idioma de la petición. */
const actionText = () => getTranslations("web.panel.actions");

/*
 * "Avisos" en "Más" (F8): guardar, quitar y probar la suscripción push de este celular. Cada
 * acción repite la guarda (`loadPanel`); la base solo deja suscribirse a un barbero.
 */

export type PushActionResult = { ok: true } | { ok: false; error: string };

export interface PushSubscriptionPayload {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function savePushSubscriptionAction(
  input: PushSubscriptionPayload,
): Promise<PushActionResult> {
  const { db } = await loadPanel("/panel/mas");
  const result = await savePushSubscription(db, input);
  if (result.ok) return { ok: true };
  return {
    ok: false,
    error:
      result.error === "FORBIDDEN"
        ? (await actionText())("pushNotBarber")
        : (await actionText())("unknown"),
  };
}

export async function deletePushSubscriptionAction(endpoint: string): Promise<PushActionResult> {
  const { db } = await loadPanel("/panel/mas");
  const result = await deletePushSubscription(db, endpoint);
  return result.ok ? { ok: true } : { ok: false, error: (await actionText())("unknown") };
}

export async function sendTestPushAction(endpoint: string): Promise<PushActionResult> {
  const { db } = await loadPanel("/panel/mas");
  const vapid = vapidFromEnv(pushSubject());
  if (!vapid) return { ok: false, error: (await actionText())("pushNotConfigured") };
  const result = await sendTestPush(db, vapid, endpoint);
  if (result.ok) return { ok: true };
  return {
    ok: false,
    error:
      result.error === "NOT_FOUND"
        ? (await actionText())("pushGone")
        : (await actionText())("unknown"),
  };
}
