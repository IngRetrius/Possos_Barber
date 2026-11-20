import "server-only";
import { MY_APPOINTMENTS_ROUTES } from "@possos/booking";
import type { MessageContext } from "@possos/notifications";
import {
  cloudApiClient,
  whatsappSendConfigFromEnv,
  type WhatsAppClient,
} from "@possos/notifications/server";
import { formatDateLong, formatTime } from "@possos/ui";
import { BUSINESS, PENDING, siteUrl } from "./business";

/*
 * Composición de WhatsApp (F7): notifications arma y manda los mensajes; la app le da las fechas
 * en Bogotá (ui), los enlaces a "Mis citas" (booking) y los datos de la barbería. Los mensajes
 * van en español aunque la persona use la app en inglés (docs/11, "Idiomas").
 *
 * Variables de entorno (solo en Vercel y en apps/web/.env.local, regla 6): WHATSAPP_ACCESS_TOKEN,
 * WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_APP_SECRET y WHATSAPP_WEBHOOK_VERIFY_TOKEN. Ver
 * fases/F7-entrega.md.
 */

/** "Manzana 26 Casa 13, barrio Kennedy, Girardot (casa esquinera naranja)". */
export function whatsappAddress(): string {
  if (!BUSINESS.address) return PENDING.es;
  const reference = BUSINESS.addressReference
    ? ` (${BUSINESS.addressReference.toLowerCase()})`
    : "";
  return `${BUSINESS.address}, ${BUSINESS.city}${reference}`;
}

export function whatsappContext(): MessageContext {
  const base = siteUrl();
  return {
    date: (iso) => formatDateLong(iso, "es"),
    time: (iso) => formatTime(iso, "es"),
    appointmentUrl: (id) => new URL(MY_APPOINTMENTS_ROUTES.detail(id), base).toString(),
    myAppointmentsUrl: new URL(MY_APPOINTMENTS_ROUTES.list, base).toString(),
    address: whatsappAddress(),
    fallbackContactUrl: BUSINESS.instagram.url,
  };
}

/** El cliente de la Cloud API, o null si faltan el token o el número. */
export function whatsappClient(): WhatsAppClient | null {
  const config = whatsappSendConfigFromEnv();
  return config ? cloudApiClient(config) : null;
}

/**
 * Si los recordatorios por WhatsApp salen: hay token y número de Meta. Mientras tanto, la app no
 * promete "Te llega un WhatsApp" y "Configuración" dice que todavía no salen.
 */
export function whatsappRemindersEnabled(): boolean {
  return whatsappSendConfigFromEnv() !== null;
}
