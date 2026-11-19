"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AUTH_ROUTES, authErrorMessage, safeNext, type AuthFormState } from "@possos/auth";
import { deleteMyAccount, getViewer } from "@possos/auth/server";
import { getNextAppointment } from "@possos/booking/server";
import {
  customersErrorMessage,
  needsConsent,
  validateProfile,
  type ProfileFormState,
} from "@possos/customers";
import { getMyProfile, saveMyProfile } from "@possos/customers/server";
import { createClient } from "@possos/supabase/server";
import { CUSTOMER_HOME } from "../../lib/session";

/*
 * Acciones del perfil del cliente. Cada una verifica la sesión por su cuenta.
 */

async function save(form: FormData): Promise<ProfileFormState & { done?: boolean }> {
  const db = await createClient();
  const viewer = await getViewer(db);
  if (!viewer) return { error: customersErrorMessage("NOT_AUTHENTICATED") };

  const current = await getMyProfile(db, viewer.userId);
  if (!current.ok) return { error: customersErrorMessage(current.error) };
  const requireConsent = needsConsent(current.data);

  const validated = validateProfile(
    {
      fullName: String(form.get("fullName") ?? ""),
      phone: String(form.get("phone") ?? ""),
      whatsappOptIn: form.get("whatsappOptIn") === "on",
      dataConsent: form.get("dataConsent") === "on",
    },
    { requireConsent },
  );
  if (!validated.ok) return { fieldErrors: validated.errors };

  const saved = await saveMyProfile(db, {
    userId: viewer.userId,
    email: viewer.email,
    profile: validated.data,
    acceptedPolicy: requireConsent,
  });
  if (!saved.ok) return { error: customersErrorMessage(saved.error) };
  return { done: true };
}

/** Completar el perfil (primer ingreso o política nueva). Al terminar vuelve a `next`. */
export async function completeProfileAction(
  _prev: ProfileFormState,
  form: FormData,
): Promise<ProfileFormState> {
  const { done, ...state } = await save(form);
  if (!done) return state;
  redirect(safeNext(form.get("next")) ?? CUSTOMER_HOME);
}

/** Editar el perfil desde /perfil. */
export async function updateProfileAction(
  _prev: ProfileFormState,
  form: FormData,
): Promise<ProfileFormState> {
  const { done, ...state } = await save(form);
  if (!done) return state;
  revalidatePath("/perfil");
  return { saved: true };
}

/**
 * Borrar la cuenta. Si tiene una cita próxima, no se borra: la cita quedaría en la agenda sin
 * nadie que llegue.
 */
export async function deleteAccountAction(_prev: AuthFormState): Promise<AuthFormState> {
  const db = await createClient();
  const viewer = await getViewer(db);
  if (!viewer) return { error: authErrorMessage("NOT_AUTHENTICATED") };

  const profile = await getMyProfile(db, viewer.userId);
  if (!profile.ok) return { error: authErrorMessage("UNKNOWN") };
  if (profile.data) {
    const upcoming = await getNextAppointment(db, profile.data.id);
    if (!upcoming.ok) return { error: authErrorMessage("UNKNOWN") };
    if (upcoming.data) {
      return { error: "Tienes una cita próxima. Cancélala antes de borrar tu cuenta." };
    }
  }

  const deleted = await deleteMyAccount(db);
  if (!deleted.ok) return { error: authErrorMessage(deleted.error) };
  redirect(`${AUTH_ROUTES.signIn}?aviso=cuenta-borrada`);
}
