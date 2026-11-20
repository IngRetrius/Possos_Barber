"use server";

import { revalidatePath } from "next/cache";
import { grantRole, listStaff, revokeRole } from "@possos/auth/server";
import { authErrorMessage, type StaffRole } from "@possos/auth";
import { barbersErrorMessage } from "@possos/barbers";
import { listBarbers, updateBarber } from "@possos/barbers/server";
import { validateBookingSettings } from "@possos/booking";
import { updateBookingSettings } from "@possos/booking/server";
import { commissionsErrorMessage } from "@possos/commissions";
import { setCommissionRate } from "@possos/commissions/server";
import { validateReminderSettings } from "@possos/notifications";
import { updateNotificationSettings } from "@possos/notifications/server";
import { loadAdminPanel } from "../../../../lib/panel";
import { getTranslations } from "next-intl/server";
import { currentLocale } from "../../../../lib/i18n";

/** Textos de las acciones del panel, en el idioma de la petición. */
const actionText = () => getTranslations("web.panel.actions");

/*
 * Administración (parte B): porcentajes, reglas de la agenda, recordatorios y roles. Cada acción
 * repite la guarda (`loadAdminPanel`) y la base vuelve a decidir.
 */

const text = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
};

/** Pasa las claves de error de una validación al texto en el idioma de la petición. */
function translateErrors<K extends string>(
  errors: Partial<Record<string, K>>,
  translate: (key: K) => string,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(errors).flatMap(([field, key]) => (key ? [[field, translate(key as K)]] : [])),
  );
}

export interface SettingsFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  saved?: number;
}

/** Porcentaje del barbero: 0 a 100, con hasta dos decimales ("50" o "50,5"). */
function parsePercent(value: string): number | null {
  const t = value.trim().replace(",", ".").replace("%", "").trim();
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(t)) return null;
  const n = Number(t);
  return n >= 0 && n <= 100 ? n : null;
}

export async function setRateAction(
  _prev: SettingsFormState,
  form: FormData,
): Promise<SettingsFormState> {
  const { db, viewer } = await loadAdminPanel("/panel/porcentajes");
  const pct = parsePercent(text(form, "porcentaje"));
  if (pct === null) return { fieldErrors: { porcentaje: (await actionText())("percentRange") } };
  const result = await setCommissionRate(db, {
    barberId: text(form, "barbero"),
    barberPct: pct,
    updatedBy: viewer.userId,
  });
  if (!result.ok) return { error: commissionsErrorMessage(result.error, await currentLocale()) };
  revalidatePath("/panel", "layout");
  return { saved: Date.now() };
}

export async function saveBookingSettingsAction(
  _prev: SettingsFormState,
  form: FormData,
): Promise<SettingsFormState> {
  const { db } = await loadAdminPanel("/panel/configuracion");
  const valid = validateBookingSettings({
    minLeadMin: text(form, "anticipacion"),
    maxDaysAhead: text(form, "dias"),
    cancelWindowMin: text(form, "cancelacion"),
    noShowThreshold: text(form, "inasistencias"),
  });
  if (!valid.ok) {
    const t = await getTranslations("booking.settings");
    return { fieldErrors: translateErrors(valid.errors, (key) => t(key)) };
  }
  const result = await updateBookingSettings(db, valid.data);
  if (!result.ok) return { error: (await actionText())("unknown") };
  revalidatePath("/", "layout");
  return { saved: Date.now() };
}

export async function saveReminderSettingsAction(
  _prev: SettingsFormState,
  form: FormData,
): Promise<SettingsFormState> {
  const { db } = await loadAdminPanel("/panel/configuracion");
  const valid = validateReminderSettings({
    firstHours: text(form, "primero"),
    secondHours: text(form, "segundo"),
    sendConfirmation: form.get("confirmacion") === "si",
  });
  if (!valid.ok) {
    const t = await getTranslations("web.panel.actions.reminders");
    return { fieldErrors: translateErrors(valid.errors, (key) => t(key)) };
  }
  const result = await updateNotificationSettings(db, valid.data);
  if (!result.ok) return { error: (await actionText())("unknown") };
  revalidatePath("/panel/configuracion");
  return { saved: Date.now() };
}

/**
 * Da un rol por correo. El de barbero enlaza la cuenta con un perfil de barbero sin cuenta (o
 * con el que ya tenía): sin perfil no puede ver agenda.
 */
export async function grantRoleAction(
  _prev: SettingsFormState,
  form: FormData,
): Promise<SettingsFormState> {
  const { db } = await loadAdminPanel("/panel/roles");
  const email = text(form, "correo").trim();
  const role = text(form, "rol") as StaffRole;
  const profileId = text(form, "perfil");
  if (!/^\S+@\S+\.\S+$/.test(email))
    return { fieldErrors: { correo: (await actionText())("emailInvalid") } };
  if (role !== "admin" && role !== "barber")
    return { fieldErrors: { rol: (await actionText())("roleRequired") } };

  const granted = await grantRole(db, { email, role });
  if (!granted.ok) return { error: authErrorMessage(granted.error, await currentLocale()) };
  if (role === "barber") {
    const barbers = await listBarbers(db);
    const linked = barbers.ok && barbers.data.some((b) => b.user_id === granted.data);
    if (!linked) {
      if (!profileId) {
        await revokeRole(db, { userId: granted.data, role: "barber" });
        return { fieldErrors: { perfil: (await actionText())("profileRequired") } };
      }
      const updated = await updateBarber(db, profileId, { user_id: granted.data });
      if (!updated.ok) {
        await revokeRole(db, { userId: granted.data, role: "barber" });
        return { error: barbersErrorMessage(updated.error, await currentLocale()) };
      }
    }
  }
  revalidatePath("/panel", "layout");
  return { saved: Date.now() };
}

export async function revokeRoleAction(
  userId: string,
  role: StaffRole,
): Promise<{ ok: boolean; error?: string }> {
  const { db } = await loadAdminPanel("/panel/roles");
  const result = await revokeRole(db, { userId, role });
  revalidatePath("/panel", "layout");
  return result.ok
    ? { ok: true }
    : { ok: false, error: authErrorMessage(result.error, await currentLocale()) };
}

/** Para la pantalla de roles: el personal con su correo. */
export async function staffListForPage() {
  const { db } = await loadAdminPanel("/panel/roles");
  return listStaff(db);
}
