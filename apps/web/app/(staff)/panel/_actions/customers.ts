"use server";

import { revalidatePath } from "next/cache";
import { bookingErrorMessage } from "@possos/booking";
import { resetNoShows } from "@possos/booking/server";
import { customersErrorMessage } from "@possos/customers";
import { addNote, deleteNote } from "@possos/customers/server";
import { canActOnBarber, loadAdminPanel, loadPanel } from "../../../../lib/panel";
import { getTranslations } from "next-intl/server";
import { currentLocale } from "../../../../lib/i18n";

/** Textos de las acciones del panel, en el idioma de la petición. */
const actionText = () => getTranslations("web.panel.actions");

/*
 * Ficha del cliente: notas privadas del barbero y reiniciar inasistencias (administrador).
 * RLS decide qué notas puede escribir y borrar cada quien.
 */

export interface NoteFormState {
  error?: string;
  saved?: number;
}

export async function addNoteAction(_prev: NoteFormState, form: FormData): Promise<NoteFormState> {
  const ctx = await loadPanel("/panel/clientes");
  const customerId = String(form.get("cliente") ?? "");
  const barberId = String(form.get("barbero") ?? "");
  const body = String(form.get("nota") ?? "");
  if (!body.trim()) return { error: (await actionText())("noteRequired") };
  if (!canActOnBarber(ctx, barberId))
    return { error: customersErrorMessage("FORBIDDEN", await currentLocale()) };
  const result = await addNote(ctx.db, { customerId, barberId, body });
  if (!result.ok) return { error: customersErrorMessage(result.error, await currentLocale()) };
  revalidatePath(`/panel/clientes/${customerId}`);
  return { saved: Date.now() };
}

export async function deleteNoteAction(form: FormData): Promise<void> {
  const { db } = await loadPanel("/panel/clientes");
  await deleteNote(db, String(form.get("nota") ?? ""));
  revalidatePath(`/panel/clientes/${String(form.get("cliente") ?? "")}`);
}

export async function resetNoShowsAction(
  customerId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { db } = await loadAdminPanel("/panel/clientes");
  const result = await resetNoShows(db, customerId);
  revalidatePath(`/panel/clientes/${customerId}`);
  return result.ok
    ? { ok: true }
    : { ok: false, error: bookingErrorMessage(result.error, await currentLocale()) };
}
