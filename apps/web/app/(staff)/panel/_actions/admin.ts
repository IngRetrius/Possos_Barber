"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { barbersErrorMessage, validateBarberProfile } from "@possos/barbers";
import {
  addPortfolioItem,
  addServiceToBarbers,
  createBarber,
  deletePortfolioItem,
  listBarbers,
  setBarberPhoto,
  setBarberServices,
  updateBarber,
} from "@possos/barbers/server";
import type { BarberFormState } from "@possos/barbers/ui";
import { validateService } from "@possos/catalog";
import {
  createService,
  listActiveServices,
  moveService,
  updateService,
} from "@possos/catalog/server";
import type { ServiceFormState } from "@possos/catalog/ui";
import { commissionsErrorMessage } from "@possos/commissions";
import { setCommissionRate } from "@possos/commissions/server";
import { loadAdminPanel } from "../../../../lib/panel";
import { getTranslations } from "next-intl/server";
import { currentLocale } from "../../../../lib/i18n";

/** Textos de las acciones del panel, en el idioma de la petición. */
const actionText = () => getTranslations("web.panel.actions");

/*
 * Acciones del administrador: servicios y barberos. Cada una repite la guarda (`requireAdmin`
 * dentro de `loadAdminPanel`: un barbero o un cliente recibe 404) y RLS vuelve a decidir.
 */

const text = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
};

function readService(form: FormData) {
  return validateService({
    name: text(form, "nombre"),
    description: text(form, "descripcion"),
    durationMin: text(form, "duracion"),
    priceCop: text(form, "precio"),
  });
}

export async function createServiceAction(
  _prev: ServiceFormState,
  form: FormData,
): Promise<ServiceFormState> {
  const { db } = await loadAdminPanel("/panel/servicios/nuevo");
  const valid = readService(form);
  if (!valid.ok) return { fieldErrors: valid.errors };
  const created = await createService(db, valid.data);
  if (!created.ok) return { error: (await actionText())("unknown") };
  // Un servicio nuevo lo hacen todos los barberos activos; se ajusta en cada barbero.
  const barbers = await listBarbers(db);
  if (barbers.ok) {
    await addServiceToBarbers(
      db,
      created.data.id,
      barbers.data.filter((b) => b.active).map((b) => b.id),
    );
  }
  revalidatePath("/", "layout");
  redirect("/panel/servicios");
}

export async function updateServiceAction(
  _prev: ServiceFormState,
  form: FormData,
): Promise<ServiceFormState> {
  const { db } = await loadAdminPanel("/panel/servicios");
  const valid = readService(form);
  if (!valid.ok) return { fieldErrors: valid.errors };
  const updated = await updateService(db, text(form, "id"), {
    ...valid.data,
    active: form.get("activo") === "si",
  });
  if (!updated.ok) return { error: (await actionText())("unknown") };
  revalidatePath("/", "layout");
  redirect("/panel/servicios");
}

export async function moveServiceAction(form: FormData): Promise<void> {
  const { db } = await loadAdminPanel("/panel/servicios");
  const direction = text(form, "direccion") === "up" ? "up" : "down";
  await moveService(db, text(form, "id"), direction);
  revalidatePath("/", "layout");
}

export interface NewBarberState {
  error?: string;
  fieldErrors?: { displayName?: string; percent?: string };
}

/** Porcentaje del barbero: 0 a 100, con hasta dos decimales ("50" o "50,5"). */
function parsePercent(value: string): number | null {
  const text = value.trim().replace(",", ".").replace("%", "");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(text)) return null;
  const n = Number(text);
  return n >= 0 && n <= 100 ? n : null;
}

/** Barbero nuevo: nombre y porcentaje (sin porcentaje no se pueden registrar cobros). */
export async function createBarberAction(
  _prev: NewBarberState,
  form: FormData,
): Promise<NewBarberState> {
  const { db, viewer } = await loadAdminPanel("/panel/barberos/nuevo");
  const name = text(form, "nombre").trim().replace(/\s+/g, " ");
  const percent = parsePercent(text(form, "porcentaje"));
  const fieldErrors: NewBarberState["fieldErrors"] = {};
  if (!name) fieldErrors.displayName = (await actionText())("nameRequired");
  if (percent === null) fieldErrors.percent = (await actionText())("percentRange");
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const created = await createBarber(db, { displayName: name });
  if (!created.ok) return { error: barbersErrorMessage(created.error, await currentLocale()) };
  const rate = await setCommissionRate(db, {
    barberId: created.data.id,
    barberPct: percent!,
    updatedBy: viewer.userId,
  });
  if (!rate.ok) return { error: commissionsErrorMessage(rate.error, await currentLocale()) };
  const services = await listActiveServices(db);
  if (services.ok) {
    await setBarberServices(
      db,
      created.data.id,
      services.data.map((s) => s.id),
    );
  }
  revalidatePath("/", "layout");
  redirect(`/panel/barberos/${created.data.id}`);
}

export async function updateBarberAction(
  _prev: BarberFormState,
  form: FormData,
): Promise<BarberFormState> {
  const { db } = await loadAdminPanel("/panel/barberos");
  const id = text(form, "id");
  const valid = validateBarberProfile({
    displayName: text(form, "nombre"),
    bio: text(form, "bio"),
    whatsappUrl: text(form, "whatsapp"),
    slotIntervalMin: text(form, "intervalo"),
  });
  if (!valid.ok) return { fieldErrors: valid.errors };
  const updated = await updateBarber(db, id, {
    ...valid.data,
    active: form.get("activo") === "si",
  });
  if (!updated.ok) return { error: barbersErrorMessage(updated.error, await currentLocale()) };
  const services = await setBarberServices(db, id, form.getAll("servicio").map(String));
  if (!services.ok) return { error: barbersErrorMessage(services.error, await currentLocale()) };
  revalidatePath("/", "layout");
  return { saved: true };
}

type UploadResult = { ok: boolean; error?: string };

export async function setPhotoAction(barberId: string, path: string): Promise<UploadResult> {
  const { db } = await loadAdminPanel("/panel/barberos");
  const result = await setBarberPhoto(db, { barberId, photoPath: path });
  revalidatePath("/", "layout");
  return result.ok
    ? { ok: true }
    : { ok: false, error: barbersErrorMessage(result.error, await currentLocale()) };
}

export async function addPortfolioAction(barberId: string, path: string): Promise<UploadResult> {
  const { db } = await loadAdminPanel("/panel/barberos");
  const result = await addPortfolioItem(db, { barberId, imagePath: path });
  revalidatePath("/", "layout");
  return result.ok
    ? { ok: true }
    : { ok: false, error: barbersErrorMessage(result.error, await currentLocale()) };
}

export async function deletePortfolioAction(id: string): Promise<UploadResult> {
  const { db } = await loadAdminPanel("/panel/barberos");
  const result = await deletePortfolioItem(db, id);
  revalidatePath("/", "layout");
  return result.ok
    ? { ok: true }
    : { ok: false, error: barbersErrorMessage(result.error, await currentLocale()) };
}
