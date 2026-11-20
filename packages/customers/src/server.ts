import "server-only";
import type { DbClient, Result } from "@possos/supabase";
import type { Customer, CustomerNote } from "./index";
import { customersErrorCode, type CustomersErrorCode } from "./internal/errors";
import { DATA_POLICY_VERSION, type ValidProfile } from "./internal/profile";
import { searchTerm, type ValidStaffCustomer } from "./internal/staff";

/**
 * API de servidor de customers. Recibe el cliente de la sesión de quien actúa; RLS y los
 * privilegios por columna deciden qué puede escribir (docs/09). La hora de la autorización
 * (`data_consent_at`) la pone la base, no esta función.
 */

type R<T> = Promise<Result<T, CustomersErrorCode>>;

const fail = (error: { code?: string; message?: string } | null) =>
  ({ ok: false, error: customersErrorCode(error) }) as const;

/**
 * El perfil de la cuenta `userId`, o null si todavía no lo completó. Se filtra por `user_id`
 * porque el personal ve, por RLS, a otros clientes.
 */
export async function getMyProfile(db: DbClient, userId: string): R<Customer | null> {
  const { data, error } = await db
    .from("customers")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return error ? fail(error) : { ok: true, data };
}

/**
 * Crea o actualiza el perfil propio.
 *
 * - Sin perfil, `acceptedPolicy` es obligatorio: sin la autorización de datos no se guarda
 *   (Ley 1581; la base lo exige también con customers_account_has_consent).
 * - Con `acceptedPolicy`, registra la versión vigente de la política y la base pone la hora.
 * - El correo se copia de la cuenta (Google o correo y contraseña) al crear el perfil.
 */
export async function saveMyProfile(
  db: DbClient,
  input: { userId: string; email: string | null; profile: ValidProfile; acceptedPolicy: boolean },
): R<Customer> {
  const current = await getMyProfile(db, input.userId);
  if (!current.ok) return current;

  const fields = {
    full_name: input.profile.fullName,
    phone: input.profile.phoneE164,
    whatsapp_opt_in: input.profile.whatsappOptIn,
    ...(input.acceptedPolicy ? { data_policy_version: DATA_POLICY_VERSION } : {}),
  };

  if (current.data) {
    const { data, error } = await db
      .from("customers")
      .update(fields)
      .eq("id", current.data.id)
      .select("*")
      .single();
    return error ? fail(error) : { ok: true, data };
  }

  if (!input.acceptedPolicy) return { ok: false, error: "CONSENT_REQUIRED" };
  const { data, error } = await db
    .from("customers")
    .insert({ ...fields, user_id: input.userId, email: input.email })
    .select("*")
    .single();
  return error ? fail(error) : { ok: true, data };
}

// ---------------------------------------------------------------------------------------------
// Panel (F6). RLS decide qué clientes ve cada quien: el barbero, los que tienen
// barber_customers con él; el administrador, todos (docs/06).
// ---------------------------------------------------------------------------------------------

/** Lo que el panel muestra de un cliente en listas y búsquedas. */
export type CustomerSummary = Pick<Customer, "id" | "full_name" | "phone" | "user_id">;

/**
 * Busca por nombre o celular entre los clientes que la sesión puede ver. Con un texto vacío
 * devuelve los más recientes.
 */
export async function searchCustomers(
  db: DbClient,
  input: { query: string; limit?: number },
): R<CustomerSummary[]> {
  const term = searchTerm(input.query);
  let request = db
    .from("customers")
    .select("id, full_name, phone, user_id")
    .neq("full_name", "Cuenta borrada");
  if (term) {
    request = /^\d+$/.test(term)
      ? request.ilike("phone", `%${term}%`)
      : request.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%`);
  }
  const { data, error } = await request
    .order(term ? "full_name" : "created_at", { ascending: Boolean(term) })
    .limit(input.limit ?? 8);
  return error ? fail(error) : { ok: true, data };
}

/** Un cliente que la sesión puede ver, o null. */
export async function getCustomer(db: DbClient, id: string): R<Customer | null> {
  const { data, error } = await db.from("customers").select("*").eq("id", id).maybeSingle();
  return error ? fail(error) : { ok: true, data };
}

/**
 * El personal registra a un cliente sin cuenta. La base guarda la hora de la autorización de
 * datos que dio de palabra y, si quien lo crea es barbero, lo enlaza con él.
 */
export async function staffCreateCustomer(db: DbClient, input: ValidStaffCustomer): R<Customer> {
  const { data, error } = await db.rpc("staff_create_customer", {
    p_full_name: input.fullName,
    p_phone: input.phoneE164,
    p_whatsapp_opt_in: input.whatsappOptIn,
    p_data_policy_version: DATA_POLICY_VERSION,
  });
  return error ? fail(error) : { ok: true, data };
}

/** Notas del barbero sobre un cliente, las más nuevas primero. RLS: el barbero ve las suyas. */
export async function listNotes(
  db: DbClient,
  input: { customerId: string; barberId?: string },
): R<CustomerNote[]> {
  let request = db.from("customer_notes").select("*").eq("customer_id", input.customerId);
  if (input.barberId) request = request.eq("barber_id", input.barberId);
  const { data, error } = await request.order("created_at", { ascending: false });
  return error ? fail(error) : { ok: true, data };
}

/** Agrega una nota privada del barbero sobre un cliente suyo. RLS lo exige. */
export async function addNote(
  db: DbClient,
  input: { customerId: string; barberId: string; body: string },
): R<CustomerNote> {
  const body = input.body.trim();
  if (!body) return { ok: false, error: "INVALID_CUSTOMER" };
  const { data, error } = await db
    .from("customer_notes")
    .insert({ customer_id: input.customerId, barber_id: input.barberId, body: body.slice(0, 500) })
    .select("*")
    .single();
  return error ? fail(error) : { ok: true, data };
}

/** Borra una nota. RLS: el barbero, las suyas; el administrador, todas. */
export async function deleteNote(db: DbClient, id: string): R<null> {
  const { error } = await db.from("customer_notes").delete().eq("id", id);
  return error ? fail(error) : { ok: true, data: null };
}
