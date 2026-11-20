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

/*
 * Administración (parte B): porcentajes, reglas de la agenda, recordatorios y roles. Cada acción
 * repite la guarda (`loadAdminPanel`) y la base vuelve a decidir.
 */

const UNKNOWN = "No pudimos completar la acción. Intenta de nuevo";

const text = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
};

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
  if (pct === null) return { fieldErrors: { porcentaje: "Escribe un porcentaje de 0 a 100" } };
  const result = await setCommissionRate(db, {
    barberId: text(form, "barbero"),
    barberPct: pct,
    updatedBy: viewer.userId,
  });
  if (!result.ok) return { error: commissionsErrorMessage(result.error) };
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
  if (!valid.ok) return { fieldErrors: valid.errors };
  const result = await updateBookingSettings(db, valid.data);
  if (!result.ok) return { error: UNKNOWN };
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
  if (!valid.ok) return { fieldErrors: valid.errors };
  const result = await updateNotificationSettings(db, valid.data);
  if (!result.ok) return { error: UNKNOWN };
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
  if (!/^\S+@\S+\.\S+$/.test(email)) return { fieldErrors: { correo: "Escribe un correo válido" } };
  if (role !== "admin" && role !== "barber") return { fieldErrors: { rol: "Elige el rol" } };

  const granted = await grantRole(db, { email, role });
  if (!granted.ok) return { error: authErrorMessage(granted.error) };
  if (role === "barber") {
    const barbers = await listBarbers(db);
    const linked = barbers.ok && barbers.data.some((b) => b.user_id === granted.data);
    if (!linked) {
      if (!profileId) {
        await revokeRole(db, { userId: granted.data, role: "barber" });
        return { fieldErrors: { perfil: "Elige el perfil de barbero de esta cuenta" } };
      }
      const updated = await updateBarber(db, profileId, { user_id: granted.data });
      if (!updated.ok) {
        await revokeRole(db, { userId: granted.data, role: "barber" });
        return { error: barbersErrorMessage(updated.error) };
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
  return result.ok ? { ok: true } : { ok: false, error: authErrorMessage(result.error) };
}

/** Para la pantalla de roles: el personal con su correo. */
export async function staffListForPage() {
  const { db } = await loadAdminPanel("/panel/roles");
  return listStaff(db);
}
