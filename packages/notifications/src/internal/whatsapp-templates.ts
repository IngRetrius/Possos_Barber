import type { TemplateMessage } from "./whatsapp-client";

/**
 * Plantillas de WhatsApp (docs/03, fases/F7-plantillas.md). Todas de categoría **utilidad**: solo
 * hablan de la cita, sin promociones, para que Meta no las pase a marketing (regla 5).
 *
 * El texto vive en Meta: aquí solo están el nombre, el idioma y los parámetros en el orden de
 * {{1}}, {{2}}... Si el dueño cambia el texto en Meta sin cambiar los parámetros, el código no
 * cambia. Van en español, aunque la persona use la app en inglés (docs/11, "Idiomas").
 */
export const TEMPLATE_LANGUAGE = "es";

export const TEMPLATES = {
  /** Apenas se reserva. Botón de enlace a la cita. */
  confirmation: "cita_confirmada",
  /** El primer recordatorio (24 h antes). Botones "Confirmo" y "Necesito cambiarla". */
  firstReminder: "recordatorio_24h",
  /** El segundo recordatorio (2 h antes), con la dirección. */
  lastReminder: "recordatorio_2h",
  /** Opcional: el personal canceló la cita (decisión 7 de docs/10). */
  cancellation: "cita_cancelada",
} as const;

export type TemplateName = (typeof TEMPLATES)[keyof typeof TEMPLATES];

export const TEMPLATE_NAMES: readonly TemplateName[] = Object.values(TEMPLATES);

export function isTemplateName(value: unknown): value is TemplateName {
  return TEMPLATE_NAMES.includes(value as TemplateName);
}

/** Lo que el mensaje necesita de la cita (parte de `get_appointment_for_notification`). */
export interface WhatsappAppointment {
  appointment_id: string;
  status: string;
  start_at: string;
  service_name: string;
  barber_name: string;
  barber_whatsapp_url: string | null;
  customer_name: string;
  customer_phone: string | null;
  whatsapp_opt_in: boolean;
}

/** Fechas en Bogotá y enlaces del sitio. Los da la app, que compone `ui` y `booking` (docs/08). */
export interface MessageContext {
  /** "jueves 20 de noviembre" */
  date: (iso: string) => string;
  /** "3:00 p. m." */
  time: (iso: string) => string;
  /** "https://.../mis-citas/<id>" */
  appointmentUrl: (appointmentId: string) => string;
  /** "https://.../mis-citas" */
  myAppointmentsUrl: string;
  /** Dirección completa para `recordatorio_2h`. */
  address: string;
  /** Contacto si el barbero no tiene WhatsApp (el Instagram de la barbería). */
  fallbackContactUrl: string;
}

// ---------------------------------------------------------------------------------------------
// Botones
// ---------------------------------------------------------------------------------------------

export type ButtonAction = "confirm" | "change";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lo que devuelve un botón de respuesta rápida: `confirm:<id>` o `change:<id>`. */
export function buttonPayload(action: ButtonAction, appointmentId: string): string {
  return `${action}:${appointmentId}`;
}

export function parseButtonPayload(
  payload: string | null | undefined,
): { action: ButtonAction; appointmentId: string } | null {
  const match = /^(confirm|change):(.+)$/.exec(payload?.trim() ?? "");
  if (!match || !UUID.test(match[2]!)) return null;
  return { action: match[1] as ButtonAction, appointmentId: match[2]!.toLowerCase() };
}

/**
 * Los botones de la plantilla dicen "Confirmo" y "Necesito cambiarla". Si Meta no devuelve el
 * payload (por ejemplo, el dueño cambia la plantilla y quita los payloads), se reconoce el texto.
 */
export function actionFromButtonText(text: string | null | undefined): ButtonAction | null {
  const t = (text ?? "").trim().toLowerCase();
  if (t === "confirmo") return "confirm";
  if (t === "necesito cambiarla") return "change";
  return null;
}

// ---------------------------------------------------------------------------------------------
// Parámetros
// ---------------------------------------------------------------------------------------------

/**
 * Meta rechaza parámetros con saltos de línea, tabulaciones o más de 4 espacios seguidos, y
 * vacíos. Se dejan en una línea, con espacios normales y un máximo prudente.
 */
export function cleanParam(value: string, fallback = "-"): string {
  const text = value.replace(/\s+/g, " ").trim().slice(0, 200);
  return text || fallback;
}

/** "Ana María Gómez" → "Ana". El saludo usa el primer nombre. */
export function firstName(fullName: string): string {
  return cleanParam(fullName.trim().split(/\s+/)[0] ?? "", "Hola");
}

const text = (value: string) => ({ type: "text" as const, text: cleanParam(value) });

/** El mensaje de plantilla de una cita, con sus parámetros en orden. */
export function templateMessage(
  name: TemplateName,
  a: WhatsappAppointment,
  ctx: MessageContext,
): TemplateMessage {
  const greeting = { type: "text" as const, text: firstName(a.customer_name) };
  const date = text(ctx.date(a.start_at));
  const time = text(ctx.time(a.start_at));
  const base = { name, language: { code: TEMPLATE_LANGUAGE } };

  switch (name) {
    case TEMPLATES.confirmation:
      return {
        ...base,
        components: [
          {
            type: "body",
            parameters: [greeting, date, time, text(a.service_name), text(a.barber_name)],
          },
          // URL dinámica del botón: https://<dominio>/mis-citas/{{1}}
          { type: "button", sub_type: "url", index: "0", parameters: [text(a.appointment_id)] },
        ],
      };
    case TEMPLATES.firstReminder:
      return {
        ...base,
        components: [
          { type: "body", parameters: [greeting, date, time, text(a.service_name)] },
          {
            type: "button",
            sub_type: "quick_reply",
            index: "0",
            parameters: [{ type: "payload", payload: buttonPayload("confirm", a.appointment_id) }],
          },
          {
            type: "button",
            sub_type: "quick_reply",
            index: "1",
            parameters: [{ type: "payload", payload: buttonPayload("change", a.appointment_id) }],
          },
        ],
      };
    case TEMPLATES.lastReminder:
      return {
        ...base,
        components: [{ type: "body", parameters: [greeting, time, text(ctx.address)] }],
      };
    case TEMPLATES.cancellation:
      return {
        ...base,
        components: [{ type: "body", parameters: [greeting, date, time] }],
      };
  }
}

// ---------------------------------------------------------------------------------------------
// Respuestas de servicio (texto libre dentro de las 24 h; Meta no las cobra hasta 1.000 al mes)
// ---------------------------------------------------------------------------------------------

export const replies = {
  confirmed: (a: WhatsappAppointment, ctx: MessageContext) =>
    `Listo, ${firstName(a.customer_name)}. Tu cita del ${ctx.date(a.start_at)} a las ${ctx.time(a.start_at)} quedó confirmada. Te esperamos.`,
  notActive: (ctx: MessageContext) =>
    `Esa cita ya no está activa. Aquí puedes ver tus citas: ${ctx.myAppointmentsUrl}`,
  change: (a: WhatsappAppointment, ctx: MessageContext) =>
    `Aquí puedes cambiar la hora o cancelar tu cita: ${ctx.appointmentUrl(a.appointment_id)}`,
  freeText: (contactUrl: string) =>
    `Hola. Este número solo envía la confirmación y los recordatorios de las citas en Possos Barber, y nadie lee los mensajes que llegan aquí. Para escribirle al barbero: ${contactUrl}`,
};
