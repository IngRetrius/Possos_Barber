"use server";

import { redirect, RedirectType } from "next/navigation";
import { AUTH_ROUTES, withNext } from "@possos/auth";
import { getViewer } from "@possos/auth/server";
import {
  bookingErrorMessage,
  MY_APPOINTMENTS_ROUTES,
  normalizeInstant,
  selectionHref,
} from "@possos/booking";
import { cancel, reschedule } from "@possos/booking/server";
import type { CancelResult, RescheduleFormState } from "@possos/booking/ui";
import { createClient } from "@possos/supabase/server";

/*
 * Acciones de "Mis citas". Cada una verifica la sesión por su cuenta; quién puede cancelar o
 * cambiar qué cita, y hasta cuándo (TOO_LATE_TO_CANCEL), lo deciden las funciones de Postgres.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** "Sí, cancelar" en la hoja. No redirige: la hoja se cierra y la página se refresca. */
export async function cancelMyAppointmentAction(appointmentId: string): Promise<CancelResult> {
  if (!UUID.test(appointmentId)) return { ok: false, error: bookingErrorMessage("NOT_FOUND") };
  const db = await createClient();
  const viewer = await getViewer(db);
  if (!viewer) return { ok: false, error: bookingErrorMessage("NOT_AUTHENTICATED") };
  const result = await cancel(db, { appointmentId });
  return result.ok ? { ok: true } : { ok: false, error: bookingErrorMessage(result.error) };
}

/**
 * "Cambiar la hora". `reschedule_appointment` cancela la cita y crea la nueva en una
 * transacción: si la hora se ocupó, la original queda igual.
 *
 * - Hora tomada: vuelve al horario del mismo día con "Esa hora se acaba de ocupar, elige otra".
 * - Cambiada: a la cita nueva, reemplazando "Confirmar" en el historial.
 * - Pasado el límite u otro error: el texto en la barra inferior.
 */
export async function rescheduleMyAppointmentAction(
  _prev: RescheduleFormState,
  form: FormData,
): Promise<RescheduleFormState> {
  const id = String(form.get("cita") ?? "");
  const date = String(form.get("fecha") ?? "");
  const startAt = normalizeInstant(String(form.get("hora") ?? ""));
  if (!UUID.test(id) || !DAY.test(date) || !startAt) {
    return { error: bookingErrorMessage("INVALID_INPUT") };
  }
  const confirmHref = selectionHref(MY_APPOINTMENTS_ROUTES.rescheduleConfirm(id), {
    date,
    startAt,
  });

  const db = await createClient();
  const viewer = await getViewer(db);
  if (!viewer) redirect(withNext(AUTH_ROUTES.signIn, confirmHref));

  const result = await reschedule(db, { appointmentId: id, newStartAt: startAt });
  if (!result.ok) {
    if (result.error === "SLOT_TAKEN") {
      redirect(
        selectionHref(MY_APPOINTMENTS_ROUTES.reschedule(id), { date }, { aviso: "ocupada" }),
        RedirectType.replace,
      );
    }
    if (result.error === "NOT_AUTHENTICATED") redirect(withNext(AUTH_ROUTES.signIn, confirmHref));
    return { error: bookingErrorMessage(result.error) };
  }
  redirect(`${MY_APPOINTMENTS_ROUTES.detail(result.data.id)}?aviso=cambiada`, RedirectType.replace);
}
