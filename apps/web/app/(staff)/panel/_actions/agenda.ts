"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@possos/auth/server";
import { bookingErrorMessage } from "@possos/booking";
import {
  cancel,
  decidePending,
  markAttendance,
  reschedule,
  staffCreateAppointment,
} from "@possos/booking/server";
import { commissionsErrorMessage } from "@possos/commissions";
import { recordCharge, updateCharge, voidCharge } from "@possos/commissions/server";
import {
  customersErrorMessage,
  validateStaffCustomer,
  type StaffCustomerErrors,
} from "@possos/customers";
import { listNotes, searchCustomers, staffCreateCustomer } from "@possos/customers/server";
import type { PickerCustomer } from "@possos/customers/ui";
import { createClient } from "@possos/supabase/server";
import { toDateKey } from "@possos/ui";
import { canActOnBarber, loadPanel, PANEL_BARBER_COOKIE } from "../../../../lib/panel";
import { parseLocalInstant } from "../../../../lib/panel-dates";
import { getTranslations } from "next-intl/server";
import { currentLocale } from "../../../../lib/i18n";

/** Textos de las acciones del panel, en el idioma de la petición. */
const actionText = () => getTranslations("web.panel.actions");

/*
 * Acciones de la agenda del panel. Cada una repite la guarda (`loadPanel`: personal o 404) y
 * deja las reglas a Postgres (estado, hora, permisos por RLS y por las funciones).
 */

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

/** El administrador elige de qué barbero ve la agenda. */
export async function selectBarberAction(barberId: string): Promise<void> {
  const db = await createClient();
  await requireAdmin(db);
  (await cookies()).set(PANEL_BARBER_COOKIE, barberId, {
    path: "/panel",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
}

/** Aprobar o rechazar una reserva pendiente. */
export async function decideAction(appointmentId: string, approve: boolean): Promise<ActionResult> {
  const { db } = await loadPanel();
  const result = await decidePending(db, { appointmentId, approve });
  if (!result.ok)
    return { ok: false, error: bookingErrorMessage(result.error, await currentLocale()) };
  return {
    ok: true,
    message: approve ? (await actionText())("approved") : (await actionText())("rejected"),
  };
}

/** "No vino": suma una inasistencia al cliente. */
export async function noShowAction(appointmentId: string): Promise<ActionResult> {
  const { db } = await loadPanel();
  const result = await markAttendance(db, { appointmentId, attended: false });
  if (!result.ok)
    return { ok: false, error: bookingErrorMessage(result.error, await currentLocale()) };
  return { ok: true, message: (await actionText())("noShow") };
}

/** Cancelar con motivo (el personal no tiene la regla de 2 horas). */
export async function cancelAction(appointmentId: string, reason: string): Promise<ActionResult> {
  const { db } = await loadPanel();
  const result = await cancel(db, { appointmentId, reason });
  if (!result.ok)
    return { ok: false, error: bookingErrorMessage(result.error, await currentLocale()) };
  return { ok: true, message: (await actionText())("cancelled") };
}

/** Busca clientes para "Nueva cita". RLS: el barbero solo encuentra a los suyos. */
export async function searchCustomersAction(query: string): Promise<PickerCustomer[]> {
  const { db } = await loadPanel();
  const result = await searchCustomers(db, { query });
  return result.ok ? result.data : [];
}

export interface AppointmentFormState {
  error?: string;
  /** Cliente nuevo que quedó creado aunque la cita fallara: el formulario lo deja elegido. */
  createdCustomer?: PickerCustomer;
  /**
   * Los del cliente nuevo son claves (las traduce el selector de cliente); los demás, texto ya
   * en el idioma de la persona.
   */
  fieldErrors?: StaffCustomerErrors & { customer?: string; service?: string; time?: string };
}

const text = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
};

/**
 * "Nueva cita": un cliente existente o uno nuevo (con la autorización de palabra), servicio y
 * hora. Si el cliente es nuevo y la cita falla, el cliente queda creado: la próxima vez se
 * encuentra con la búsqueda.
 */
export async function createAppointmentAction(
  _prev: AppointmentFormState,
  form: FormData,
): Promise<AppointmentFormState> {
  const ctx = await loadPanel("/panel/cita/nueva");
  const barberId = text(form, "barbero");
  if (!canActOnBarber(ctx, barberId))
    return { error: bookingErrorMessage("FORBIDDEN", await currentLocale()) };

  const fieldErrors: AppointmentFormState["fieldErrors"] = {};
  const serviceId = text(form, "servicio");
  if (!serviceId) fieldErrors.service = (await actionText())("serviceRequired");
  const startAt = parseLocalInstant(text(form, "fecha"), text(form, "hora"));
  if (!startAt) fieldErrors.time = (await actionText())("timeRequired");

  let customerId = "";
  let newCustomer: ReturnType<typeof validateStaffCustomer> | null = null;
  if (text(form, "modo") === "nuevo") {
    newCustomer = validateStaffCustomer({
      fullName: text(form, "nuevo_nombre"),
      phone: text(form, "nuevo_celular"),
      dataConsent: form.get("nuevo_autoriza") === "si",
      whatsappOptIn: form.get("nuevo_whatsapp") === "si",
    });
    if (!newCustomer.ok) Object.assign(fieldErrors, newCustomer.errors);
  } else {
    customerId = text(form, "cliente");
    if (!customerId) fieldErrors.customer = (await actionText())("customerRequired");
  }
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  let createdCustomer: PickerCustomer | undefined;
  if (newCustomer?.ok) {
    const created = await staffCreateCustomer(ctx.db, newCustomer.data);
    if (!created.ok) return { error: customersErrorMessage(created.error, await currentLocale()) };
    customerId = created.data.id;
    createdCustomer = {
      id: created.data.id,
      full_name: created.data.full_name,
      phone: created.data.phone,
    };
  }

  const result = await staffCreateAppointment(ctx.db, {
    customerId,
    serviceId,
    // Los adicionales marcados; la base descarta la cita si alguno no es del servicio.
    addonIds: form.getAll("adicional").filter((v): v is string => typeof v === "string"),
    barberId,
    startAt: startAt!,
  });
  if (!result.ok)
    return { error: bookingErrorMessage(result.error, await currentLocale()), createdCustomer };
  redirect(`/panel?dia=${toDateKey(startAt!)}&aviso=cita-creada`);
}

export interface RescheduleFormState {
  error?: string;
  fieldErrors?: { time?: string };
}

/** "Mover": la misma cita a otra hora, sin la regla de 2 horas. */
export async function rescheduleAction(
  _prev: RescheduleFormState,
  form: FormData,
): Promise<RescheduleFormState> {
  const ctx = await loadPanel();
  const appointmentId = text(form, "cita");
  const startAt = parseLocalInstant(text(form, "fecha"), text(form, "hora"));
  if (!startAt) return { fieldErrors: { time: (await actionText())("timeRequired") } };
  const result = await reschedule(ctx.db, { appointmentId, newStartAt: startAt });
  if (!result.ok) return { error: bookingErrorMessage(result.error, await currentLocale()) };
  redirect(`/panel?dia=${toDateKey(startAt)}&aviso=cita-movida`);
}

/** Notas del barbero sobre un cliente, para la hoja de la cita. RLS: el barbero ve las suyas. */
export async function notesAction(
  customerId: string,
  barberId: string,
): Promise<{ id: string; body: string; created_at: string }[]> {
  const { db } = await loadPanel();
  const result = await listNotes(db, { customerId, barberId });
  return result.ok ? result.data.map(({ id, body, created_at }) => ({ id, body, created_at })) : [];
}

// ---------------------------------------------------------------------------------------------
// Cobros (parte B). "Vino" marca la asistencia y después registra el cobro; si el cobro falla,
// la cita queda completada y aparece en "Por cerrar" como "Falta registrar el cobro".
// ---------------------------------------------------------------------------------------------

/** "Vino" con su cobro. */
export async function attendAction(
  appointmentId: string,
  amountCop: number,
): Promise<ActionResult> {
  const { db } = await loadPanel();
  const attended = await markAttendance(db, { appointmentId, attended: true });
  if (!attended.ok)
    return { ok: false, error: bookingErrorMessage(attended.error, await currentLocale()) };
  const charged = await recordCharge(db, { appointmentId, amountCop });
  if (!charged.ok) {
    return {
      ok: false,
      error: `${(await actionText())("chargeMissing")}: ${commissionsErrorMessage(charged.error, await currentLocale())}`,
    };
  }
  return { ok: true, message: (await actionText())("chargeSaved") };
}

/** Registrar el cobro de una cita que ya está atendida. */
export async function recordChargeAction(
  appointmentId: string,
  amountCop: number,
): Promise<ActionResult> {
  const { db } = await loadPanel();
  const result = await recordCharge(db, { appointmentId, amountCop });
  if (!result.ok)
    return { ok: false, error: commissionsErrorMessage(result.error, await currentLocale()) };
  return { ok: true, message: (await actionText())("chargeSaved") };
}

/** Corregir el valor: el barbero, el mismo día; el administrador, siempre. */
export async function updateChargeAction(
  chargeId: string,
  amountCop: number,
): Promise<ActionResult> {
  const { db } = await loadPanel();
  const result = await updateCharge(db, { chargeId, amountCop });
  if (!result.ok)
    return { ok: false, error: commissionsErrorMessage(result.error, await currentLocale()) };
  revalidatePath("/panel", "layout");
  return { ok: true, message: (await actionText())("chargeCorrected") };
}

/** Anular un cobro con motivo. Solo el administrador; el cobro no se borra. */
export async function voidChargeAction(chargeId: string, reason: string): Promise<ActionResult> {
  const { db } = await loadPanel();
  const result = await voidCharge(db, { chargeId, reason });
  if (!result.ok)
    return { ok: false, error: commissionsErrorMessage(result.error, await currentLocale()) };
  revalidatePath("/panel", "layout");
  return { ok: true, message: (await actionText())("chargeVoided") };
}
