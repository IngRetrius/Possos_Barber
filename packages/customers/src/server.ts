import "server-only";
import type { DbClient, Result } from "@possos/supabase";
import type { Customer } from "./index";
import { customersErrorCode, type CustomersErrorCode } from "./internal/errors";
import { DATA_POLICY_VERSION, type ValidProfile } from "./internal/profile";

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
