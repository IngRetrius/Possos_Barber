/*
 * Ayudantes de las pruebas de WhatsApp: una cita, el contexto de mensajes y un cliente falso que
 * guarda lo que se mandó. Solo los importan los archivos *.test.ts.
 */
import { vi } from "vitest";
import type { SendResult, TemplateMessage, WhatsAppClient } from "./whatsapp-client";
import type { MessageContext, WhatsappAppointment } from "./whatsapp-templates";

export const APPOINTMENT_ID = "1b2c3d4e-0000-4000-8000-000000000001";

export function appointment(patch: Partial<WhatsappAppointment> = {}): WhatsappAppointment {
  return {
    appointment_id: APPOINTMENT_ID,
    status: "booked",
    start_at: "2026-11-21T20:00:00+00:00",
    service_name: "Corte normal + Barba",
    barber_name: "Possos",
    barber_whatsapp_url: "https://wa.me/573009999999",
    customer_name: "Ana María Gómez",
    customer_phone: "+573001234567",
    whatsapp_opt_in: true,
    ...patch,
  };
}

export const context: MessageContext = {
  date: () => "sábado 21 de noviembre",
  time: () => "3:00 p. m.",
  appointmentUrl: (id) => `https://possos.test/mis-citas/${id}`,
  myAppointmentsUrl: "https://possos.test/mis-citas",
  address: "Manzana 26 Casa 13, barrio Kennedy, Girardot (casa esquinera naranja)",
  fallbackContactUrl: "https://www.instagram.com/possosbarber/",
};

export interface FakeClient extends WhatsAppClient {
  templates: { to: string; template: TemplateMessage }[];
  texts: { to: string; body: string; replyTo?: string }[];
}

/** Cliente falso: responde en orden lo que se le pase (por omisión, siempre acepta). */
export function fakeClient(results: SendResult[] = []): FakeClient {
  let n = 0;
  const next = (): SendResult => results[n++] ?? { ok: true, messageId: `wamid.prueba${n}` };
  const client: FakeClient = {
    templates: [],
    texts: [],
    sendTemplate: vi.fn(async (to: string, template: TemplateMessage) => {
      client.templates.push({ to, template });
      // Un respiro, como la red: deja que otro despacho corra en paralelo.
      await new Promise((resolve) => setTimeout(resolve, 1));
      return next();
    }),
    sendText: vi.fn(async (to: string, body: string, replyTo?: string) => {
      client.texts.push({ to, body, replyTo });
      return next();
    }),
  };
  return client;
}
