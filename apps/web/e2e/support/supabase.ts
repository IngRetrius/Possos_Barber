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
  /** Barbero sin rol de administrador e inactivo (F6). */
  barber2: "barbero2@ejemplo.test",
  barber2Id: "5eedba00-0000-0000-0000-000000000002",
  customer2UserId: "5eed0000-0000-0000-0000-000000000003",
} as const;

/** Prefijo de lo que crean las pruebas del panel (clientes, servicios, bloqueos). */
export const E2E_PREFIX = "E2E";

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
  const rows = await rest<
    { id: string; customers: { email: string | null; full_name: string } | null }[]
  >(
    `appointments?select=id,customers(email,full_name)&status=in.(pending_approval,booked,confirmed)` +
      `&period=not.sl.${encodeURIComponent(`[${now},${now}]`)}`,
    { token },
  );
  const testEmails = new Set<string>([SEED.customer, SEED.customer2, SEED.approval]);
  for (const row of rows) {
    const email = row.customers?.email ?? "";
    const name = row.customers?.full_name ?? "";
    if (!testEmails.has(email) && !email.startsWith("e2e-") && !name.startsWith(E2E_PREFIX)) {
      continue;
    }
    await rpc("cancel_appointment", { p_id: row.id, p_reason: "Limpieza de pruebas e2e" }, token);
  }
}

/**
 * Deja la base local como estaba después de las pruebas del panel: borra los bloqueos con motivo
 * `E2E...` y desactiva los servicios `E2E...` (si quedaran activos, el flujo de reserva dejaría
 * de saltarse el paso del servicio).
 */
export async function cleanPanelTestData(): Promise<void> {
  const token = await signInApi(SEED.admin);
  // La prueba de roles le da a cliente2 el rol de administrador y se lo quita; si falló a mitad,
  // se lo quita aquí. Si no lo tenía, revoke_role no hace nada.
  await rpc("revoke_role", { p_user_id: SEED.customer2UserId, p_role: "admin" }, token);
  await rest(`time_off?reason=like.${E2E_PREFIX}*`, { method: "DELETE", token });
  await rest(`services?name=like.${E2E_PREFIX}*`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ active: false }),
  });
}

/** Reserva del cliente con un día y hora libres; devuelve la cita. */
export async function bookFreeSlot(
  email: string,
  day: string,
  index = 0,
): Promise<{ id: string; startAt: string }> {
  const starts = await availableStarts(day);
  const startAt = starts[index];
  if (!startAt) throw new Error(`No hay hora libre número ${index} el ${day}`);
  const { id } = await bookAs(email, startAt);
  return { id, startAt };
}

/** "$30.000", como `formatPrice` de @possos/ui. */
export function pesos(amount: number): string {
  return `$${String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

/**
 * Una cita pasada, sin marcar, de un cliente sin cuenta nuevo (`E2E Cobro ...`), creada por el
 * administrador: sirve para "Vino" con su cobro. Busca hacia atrás un día con horario y una hora
 * libre (las citas atendidas de corridas anteriores ocupan las suyas).
 */
export async function pastWalkInAppointment(name: string): Promise<{ id: string }> {
  const token = await signInApi(SEED.admin);
  const customer = await rpc<{ id: string }>(
    "staff_create_customer",
    { p_full_name: name, p_phone: "+573005550000", p_data_policy_version: "e2e" },
    token,
  );
  const today = new Date(Date.now() - 5 * 3_600_000);
  for (let back = 1; back <= 20; back++) {
    const day = new Date(today.getTime() - back * 86_400_000).toISOString().slice(0, 10);
    for (let hour = 9; hour <= 17; hour++) {
      const startAt = new Date(`${day}T${String(hour).padStart(2, "0")}:00:00-05:00`).toISOString();
      try {
        return await rpc<{ id: string }>(
          "staff_create_appointment",
          {
            p_customer_id: customer.id,
            p_service_id: SEED.serviceId,
            p_barber_id: SEED.barberId,
            p_start_at: startAt,
          },
          token,
        );
      } catch {
        // Fuera de horario, bloqueada u ocupada: la siguiente.
      }
    }
  }
  throw new Error("No hay horas pasadas libres en los últimos 20 días");
}

/** Límite para cancelar o cambiar (`booking_settings.cancel_window_min`), como administrador. */
export async function setCancelWindow(minutes: number): Promise<void> {
  const token = await signInApi(SEED.admin);
  await rest("booking_settings?id=eq.true", {
    method: "PATCH",
    token,
    body: JSON.stringify({ cancel_window_min: minutes }),
  });
}

/** Enlace de WhatsApp del barbero de la semilla (null lo quita), como administrador. */
export async function setBarberWhatsapp(url: string | null): Promise<void> {
  const token = await signInApi(SEED.admin);
  await rest(`barbers?id=eq.${SEED.barberId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ whatsapp_url: url }),
  });
}

/** "Mis citas" de una cuenta, según la base (`list_my_appointments`). */
export async function myAppointments(
  email: string,
): Promise<{ id: string; status: string; start_at: string }[]> {
  return rpc("list_my_appointments", {}, await signInApi(email));
}

/** De qué cita viene una cita reprogramada, leído como su dueño. */
export async function rescheduledFrom(email: string, id: string): Promise<string | null> {
  const token = await signInApi(email);
  const rows = await rest<{ rescheduled_from: string | null }[]>(
    `appointments?select=rescheduled_from&id=eq.${id}`,
    { token },
  );
  return rows[0]?.rescheduled_from ?? null;
}

/** Liquidación de hoy del barbero de la semilla, según la base. */
export async function todaySettlement(): Promise<{
  amount: number;
  barber: number;
  business: number;
}> {
  const token = await signInApi(SEED.admin);
  const day = new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10);
  const rows = await rpc<
    { amount_cop: number; barber_amount_cop: number; business_amount_cop: number }[]
  >("get_settlement", { p_from: day, p_to: day, p_barber_id: SEED.barberId }, token);
  const row = rows[0];
  return {
    amount: Number(row?.amount_cop ?? 0),
    barber: Number(row?.barber_amount_cop ?? 0),
    business: Number(row?.business_amount_cop ?? 0),
  };
}

/** Secreto de la ruta de despacho (F8): en local, el de apps/web/.env.local; en CI, del entorno. */
export function dispatchSecret(): string {
  const secret = process.env.CRON_SECRET ?? fromEnvFile("CRON_SECRET");
  if (!secret) throw new Error("Falta CRON_SECRET");
  return secret;
}
