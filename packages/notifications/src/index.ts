/**
 * API pública de @possos/notifications: WhatsApp, push, plantillas, despacho y webhook.
 * Solo se exporta lo que otros módulos necesitan. Lo interno va en src/internal/ (docs/08).
 *
 * En F2 solo existen las tablas; el despacho y el webhook son de F7.
 */
import type { Tables } from "@possos/supabase";

export type NotificationSettings = Tables<"notification_settings">;
export type MessageJob = Tables<"message_jobs">;
export type InboundMessage = Tables<"inbound_messages">;
export type PushSubscription = Tables<"push_subscriptions">;

export {
  offsetToHours,
  validateReminderSettings,
  type ReminderSettingsErrors,
  type ReminderSettingsInput,
  type ValidReminderSettings,
} from "./internal/settings";
