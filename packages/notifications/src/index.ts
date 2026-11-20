/**
 * API pública de @possos/notifications: WhatsApp, push, plantillas, despacho y webhook.
 * Solo se exporta lo que otros módulos necesitan. Lo interno va en src/internal/ (docs/08).
 *
 * F6: configuración de los recordatorios. F8: despacho de booking_events y push al barbero.
 * F7: WhatsApp (plantillas, envío y webhook en `./server`; aquí, lo que muestra el panel).
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

export {
  appointmentPanelUrl,
  pushKindFor,
  pushMessageFor,
  TEST_PUSH_MESSAGE,
  type PushAppointment,
  type PushFormat,
  type PushKind,
  type PushMessage,
} from "./internal/push-message";

export {
  WHATSAPP_PRICE_COP,
  errorCodeOf,
  reminderFailed,
  reminderSummary,
  whatsappCostEstimate,
  type MessageJobView,
  type MessageKind,
  type MessageState,
  type ReminderSummary,
  type WhatsappUsage,
} from "./internal/whatsapp-status";

export {
  TEMPLATES,
  TEMPLATE_LANGUAGE,
  type MessageContext,
  type TemplateName,
  type WhatsappAppointment,
} from "./internal/whatsapp-templates";
