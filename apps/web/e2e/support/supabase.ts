import { readFileSync } from "node:fs";
import { join } from "node:path";

/*
 * Supabase local por su API REST, para lo que en las pruebas hace "otra persona": un segundo
 * cliente que toma una hora, o el administrador que limpia las citas de las pruebas. Sin
 * dependencias: Auth (`/auth/v1/token`) y PostgREST (`/rest/v1`).
 *
 * En CI las variables vienen de `supabase status`; en local, de apps/web/.env.local.
 */

function fromEnvFile(name: string): string | undefined {
  try {
    const text = readFileSync(join(import.meta.dirname, "../../.env.local"), "utf8");
    const line = text.split("\n").find((l) => l.startsWith(`${name}=`));
    return line
      ?.slice(name.length + 1)
      .trim()
      .replace(/^"|"$/g, "");
  } catch {
    return undefined;
  }
}

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? fromEnvFile("NEXT_PUBLIC_SUPABASE_URL");
const KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  fromEnvFile("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

function config() {
  if (!URL_ || !KEY) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL y la clave publicable");
  return { url: URL_, key: KEY };
}

/** Datos de la semilla (supabase/seed.sql). */
export const SEED = {
  password: "possos-local",
  serviceId: "5eed5e00-0000-0000-0000-000000000001",
  barberId: "5eedba00-0000-0000-0000-000000000001",
  admin: "barbero@ejemplo.test",
  customer: "cliente@ejemplo.test",
  customer2: "cliente2@ejemplo.test",
  approval: "aprobacion@ejemplo.test",
} as const;

const tokens = new Map<string, string>();

/** Token de acceso de una cuenta con correo y contraseña. */
export async function signInApi(email: string, password: string = SEED.password): Promise<string> {
  const cached = tokens.get(email);
  if (cached) return cached;
  const { url, key } = config();
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(`No se pudo ingresar como ${email}: ${response.status}`);
  const { access_token } = (await response.json()) as { access_token: string };
  tokens.set(email, access_token);
  return access_token;
}

async function rest<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const { url, key } = config();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${init.token ?? key}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${path}: ${response.status} ${text}`);
  return (text ? JSON.parse(text) : null) as T;
}

/** Llama a una función de Postgres; con `token`, como esa cuenta. */
export function rpc<T>(fn: string, args: Record<string, unknown>, token?: string): Promise<T> {
  return rest<T>(`rpc/${fn}`, { method: "POST", body: JSON.stringify(args), token });
}

/** Días de la ventana con horas libres, sin sesión. */
export async function availableDays(): Promise<{ day: string; slots: number }[]> {
  return rpc("get_available_days", { p_service_id: SEED.serviceId, p_barber_id: SEED.barberId });
}

/** Inicios libres de un día, en el formato de la URL (`toISOString`). */
export async function availableStarts(day: string): Promise<string[]> {
  const rows = await rpc<{ start_at: string }[]>("get_available_slots", {
    p_service_id: SEED.serviceId,
    p_day: day,
    p_barber_id: SEED.barberId,
  });
  return rows.map((r) => new Date(r.start_at).toISOString());
}

/** Un día después de hoy con al menos `min` horas libres (el de hoy puede quedar sin horas). */
export async function dayWithSlots(min = 2, skip: string[] = []): Promise<string> {
  const days = await availableDays();
  const day = days.slice(1).find((d) => d.slots >= min && !skip.includes(d.day));
  if (!day) throw new Error("No hay días con horas libres en la semilla");
  return day.day;
}

/** Reserva como otra cuenta (la "otra persona" que toma la hora). */
export async function bookAs(email: string, startAt: string): Promise<{ id: string }> {
  const token = await signInApi(email);
  return rpc(
    "book_appointment",
    {
      p_service_id: SEED.serviceId,
      p_start_at: startAt,
      p_barber_id: SEED.barberId,
    },
    token,
  );
}

/** Estado de una cita, leído como su dueño. */
export async function appointmentStatus(email: string, id: string): Promise<string | null> {
  const token = await signInApi(email);
  const rows = await rest<{ status: string }[]>(`appointments?select=status&id=eq.${id}`, {
    token,
  });
  return rows[0]?.status ?? null;
}

/**
 * Cancela, como administrador, las citas futuras de las cuentas de prueba (las de la semilla y
 * las que crean las pruebas, `e2e-...`), para que las pruebas se puedan repetir sin reiniciar
 * la base. No toca las de otras cuentas.
 */
export async function cancelTestAppointments(): Promise<void> {
  const token = await signInApi(SEED.admin);
  const now = new Date().toISOString();
  const rows = await rest<{ id: string; customers: { email: string | null } | null }[]>(
    `appointments?select=id,customers(email)&status=in.(pending_approval,booked,confirmed)` +
      `&period=not.sl.${encodeURIComponent(`[${now},${now}]`)}`,
    { token },
  );
  const testEmails = new Set<string>([SEED.customer, SEED.customer2, SEED.approval]);
  for (const row of rows) {
    const email = row.customers?.email ?? "";
    if (!testEmails.has(email) && !email.startsWith("e2e-")) continue;
    await rpc("cancel_appointment", { p_id: row.id, p_reason: "Limpieza de pruebas e2e" }, token);
  }
}
