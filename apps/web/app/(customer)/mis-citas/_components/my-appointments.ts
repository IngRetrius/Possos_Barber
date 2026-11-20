import "server-only";
import type { Locale } from "@possos/config/constants";
import { notFound, redirect } from "next/navigation";
import type { MyAppointment } from "@possos/booking";
import { getMyAppointment } from "@possos/booking/server";
import { servicePriceLabel } from "@possos/catalog";
import type { DbClient } from "@possos/supabase";
import { addressLabel, BUSINESS } from "../../../../lib/business";
import { requireCustomer, STAFF_HOME } from "../../../../lib/session";

/*
 * Lo común de las páginas de "Mis citas": la guarda y lo que la tarjeta necesita de la barbería.
 */

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Lo que la tarjeta de la cita toma de la barbería (no de la base), en el idioma de la persona.
 * `instagramLabel` es "Escríbele por Instagram" en su idioma.
 */
export function cardContext(appointment: MyAppointment, locale: Locale, instagramLabel: string) {
  return {
    priceLabel: servicePriceLabel(appointment.priceCop, locale),
    location: addressLabel(locale),
    // Si el barbero no tiene WhatsApp, el Instagram de la barbería: nunca un botón roto.
    fallbackContact: { label: instagramLabel, href: BUSINESS.instagram.url },
  };
}

/**
 * Una cita del cliente de la sesión, para `/mis-citas/<id>` y sus subrutas (`suffix`), que son
 * el destino de los botones de WhatsApp (F7):
 *
 * - Sin sesión: ingresar y volver (también lo hace el proxy).
 * - Personal: la cita en su panel (`/panel?cita=<id>`); el panel decide si la puede ver.
 * - Otra cuenta o un id que no existe: 404, sin decir si la cita existe (regla 7).
 * - Cita reprogramada: la misma ruta con la cita que la reemplazó.
 */
export async function loadMyAppointment(
  db: DbClient,
  id: string,
  suffix: (id: string) => string,
): Promise<MyAppointment> {
  if (!UUID.test(id)) notFound();
  const path = suffix(id);
  await requireCustomer(db, path, { staffTo: `${STAFF_HOME}?cita=${id}` });
  const result = await getMyAppointment(db, id);
  if (!result.ok) throw new Error(`No se pudo leer la cita: ${result.error}`);
  const appointment = result.data;
  if (!appointment) notFound();
  if (appointment.replacedBy) redirect(suffix(appointment.replacedBy));
  return appointment;
}
