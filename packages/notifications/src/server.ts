import "server-only";
import type { DbClient, Result } from "@possos/supabase";
import type { NotificationSettings } from "./index";
import type { ValidReminderSettings } from "./internal/settings";

/**
 * API de servidor de notifications. En F6 solo lee y cambia la configuración de los
 * recordatorios; el despacho y el webhook son de F7.
 */

type R<T> = Promise<Result<T, "FORBIDDEN" | "UNKNOWN">>;

export async function getNotificationSettings(db: DbClient): R<NotificationSettings> {
  const { data, error } = await db.from("notification_settings").select("*").maybeSingle();
  if (error || !data) return { ok: false, error: "UNKNOWN" };
  return { ok: true, data };
}

/** Solo el administrador (RLS: para los demás, el update no toca ninguna fila). */
export async function updateNotificationSettings(
  db: DbClient,
  patch: ValidReminderSettings,
): R<NotificationSettings> {
  const { data, error } = await db
    .from("notification_settings")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", true)
    .select("*")
    .maybeSingle();
  if (error) return { ok: false, error: "UNKNOWN" };
  return data ? { ok: true, data } : { ok: false, error: "FORBIDDEN" };
}
