"use server";

import { redirect, RedirectType } from "next/navigation";
import { AUTH_ROUTES, withNext } from "@possos/auth";
import { getViewer } from "@possos/auth/server";
import {
  ADDON_PARAM,
  ANY_BARBER,
  BOOKING_ROUTES,
  bookingErrorMessage,
  parseSelection,
  selectionHref,
} from "@possos/booking";
import { book } from "@possos/booking/server";
import type { BookFormState } from "@possos/booking/ui";
import { createClient } from "@possos/supabase/server";
import { currentLocale } from "../../../lib/i18n";
import { COMPLETE_PROFILE } from "../../../lib/session";

/**
 * "Reservar" (paso Confirmar). Verifica la sesión por su cuenta; las reglas (horario, hora
 * libre, aprobación) las decide `book_appointment` en Postgres.
 *
 * - Hora tomada: vuelve al horario del mismo día con el aviso.
 * - Sin sesión o sin perfil: a ingresar o a completar el perfil, y de vuelta a "Confirmar".
 * - Reservada: a "Listo", reemplazando "Confirmar" en el historial (atrás no vuelve a un
 *   resumen que ya no se puede reservar).
 */
export async function bookAction(_prev: BookFormState, form: FormData): Promise<BookFormState> {
  const locale = await currentLocale();
  const fields = new URLSearchParams();
  for (const key of ["servicio", "barbero", "fecha", "hora"]) {
    const value = form.get(key);
    if (typeof value === "string") fields.set(key, value);
  }
  for (const value of form.getAll(ADDON_PARAM)) {
    if (typeof value === "string") fields.append(ADDON_PARAM, value);
  }
  const selection = parseSelection(fields);
  if (!selection.serviceId || !selection.barberId || !selection.startAt) {
    return { error: bookingErrorMessage("INVALID_INPUT", locale) };
  }
  const confirmHref = selectionHref(BOOKING_ROUTES.confirm, selection);

  const db = await createClient();
  const viewer = await getViewer(db);
  if (!viewer) redirect(withNext(AUTH_ROUTES.signIn, confirmHref));

  const result = await book(db, {
    serviceId: selection.serviceId,
    addonIds: selection.addonIds,
    startAt: selection.startAt,
    barberId: selection.barberId === ANY_BARBER ? undefined : selection.barberId,
  });
  if (!result.ok) {
    if (result.error === "SLOT_TAKEN") {
      redirect(
        selectionHref(BOOKING_ROUTES.time, { ...selection, startAt: null }, { aviso: "ocupada" }),
        RedirectType.replace,
      );
    }
    if (result.error === "NOT_AUTHENTICATED") redirect(withNext(AUTH_ROUTES.signIn, confirmHref));
    if (result.error === "NO_CUSTOMER_PROFILE") redirect(withNext(COMPLETE_PROFILE, confirmHref));
    return { error: bookingErrorMessage(result.error, locale) };
  }
  redirect(`${BOOKING_ROUTES.done}?cita=${result.data.id}`, RedirectType.replace);
}
