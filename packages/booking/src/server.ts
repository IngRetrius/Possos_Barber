import "server-only";
import { createTimeOff } from "@possos/barbers/server";
import type { BarbersErrorCode, TimeOff } from "@possos/barbers";
import { errorCode, type Database, type DbClient, type Result } from "@possos/supabase";
import { normalizeInstant, OCCUPYING_STATUSES, parsePeriod, UPCOMING_STATUSES } from "./index";
import type {
  AgendaAppointment,
  Appointment,
  AppointmentStatus,
  AppointmentForNotification,
  AvailableSlot,
  BookingSettings,
  ConfirmVia,
  ConflictingAppointment,
  CustomerBookingStatus,
  DayAvailability,
  MyAppointment,
} from "./index";
import { BOOKING_ERROR_CODES, type BookingErrorCode } from "./internal/errors";
import type { ValidBookingSettings } from "./internal/settings";

/**
 * API de servidor de booking. Cada función recibe el cliente de Supabase de quien actúa:
 * el de la sesión (`@possos/supabase/server`) para clientes y personal, o el de la clave
 * secreta (`/admin`) para el servidor de notificaciones. Las reglas viven en Postgres.
 * Fechas y horas en ISO 8601; días en `YYYY-MM-DD` (hora de Bogotá).
 */

type R<T> = Promise<Result<T, BookingErrorCode>>;

const fail = (error: { message?: string } | null) =>
  ({ ok: false, error: errorCode(error, BOOKING_ERROR_CODES) }) as const;

/** Horas libres de un día para un servicio; sin `barberId`, de todos los barberos. */
export async function getAvailableSlots(
  db: DbClient,
  input: { serviceId: string; day: string; barberId?: string },
): R<AvailableSlot[]> {
  const { data, error } = await db.rpc("get_available_slots", {
    p_service_id: input.serviceId,
    p_day: input.day,
    p_barber_id: input.barberId,
  });
  return error ? fail(error) : { ok: true, data };
}

/**
 * Inicios de las horas libres de un día, normalizados con `toISOString` para compararlos con el
 * parámetro `hora` de la URL. Sin `barberId`, las de "cualquiera disponible".
 */
export async function getAvailableStarts(
  db: DbClient,
  input: { serviceId: string; day: string; barberId?: string },
): R<string[]> {
  const result = await getAvailableSlots(db, input);
  if (!result.ok) return result;
  return {
    ok: true,
    data: result.data.map((s) => normalizeInstant(s.start_at)).filter((s) => s !== null),
  };
}

/** Horas libres de cada día de la ventana de reserva (hoy y los `max_days_ahead` siguientes). */
export async function getAvailableDays(
  db: DbClient,
  input: { serviceId: string; barberId?: string },
): R<DayAvailability[]> {
  const { data, error } = await db.rpc("get_available_days", {
    p_service_id: input.serviceId,
    p_barber_id: input.barberId,
  });
  return error
    ? fail(error)
    : { ok: true, data: data.map((d) => ({ date: d.day, slots: d.slots })) };
}

/**
 * Si la próxima reserva del cliente de la sesión quedará pendiente de aprobación (2 o más
 * inasistencias). El cliente no ve su contador (docs/06), solo este aviso.
 */
export async function requiresApproval(db: DbClient): R<boolean> {
  const { data, error } = await db.rpc("my_booking_requires_approval");
  return error ? fail(error) : { ok: true, data: data === true };
}

/** Una cita que la sesión puede ver (RLS: la suya, o las de su agenda si es personal). */
export async function getAppointment(db: DbClient, id: string): R<Appointment | null> {
  const { data, error } = await db.from("appointments").select("*").eq("id", id).maybeSingle();
  return error ? fail(error) : { ok: true, data };
}

/** Reserva del cliente. Sin `barberId` es "cualquiera disponible". */
export async function book(
  db: DbClient,
  input: { serviceId: string; startAt: string; barberId?: string },
): R<Appointment> {
  const { data, error } = await db.rpc("book_appointment", {
    p_service_id: input.serviceId,
    p_start_at: input.startAt,
    p_barber_id: input.barberId,
  });
  return error ? fail(error) : { ok: true, data };
}

/** Cita creada por el personal, también para clientes sin cuenta. */
export async function staffCreateAppointment(
  db: DbClient,
  input: { customerId: string; serviceId: string; barberId: string; startAt: string },
): R<Appointment> {
  const { data, error } = await db.rpc("staff_create_appointment", {
    p_customer_id: input.customerId,
    p_service_id: input.serviceId,
    p_barber_id: input.barberId,
    p_start_at: input.startAt,
  });
  return error ? fail(error) : { ok: true, data };
}

/** Cancela. El personal debe dar un motivo. */
export async function cancel(
  db: DbClient,
  input: { appointmentId: string; reason?: string },
): R<Appointment> {
  const { data, error } = await db.rpc("cancel_appointment", {
    p_id: input.appointmentId,
    p_reason: input.reason,
  });
  return error ? fail(error) : { ok: true, data };
}

/** Mueve la cita a otra hora (y opcionalmente a otro barbero) en una sola transacción. */
export async function reschedule(
  db: DbClient,
  input: { appointmentId: string; newStartAt: string; newBarberId?: string },
): R<Appointment> {
  const { data, error } = await db.rpc("reschedule_appointment", {
    p_id: input.appointmentId,
    p_new_start_at: input.newStartAt,
    p_new_barber_id: input.newBarberId,
  });
  return error ? fail(error) : { ok: true, data };
}

/** Confirma una cita reservada. Confirmar dos veces no es error. */
export async function confirmAppointment(
  db: DbClient,
  input: { appointmentId: string; via: ConfirmVia },
): R<Appointment> {
  const { data, error } = await db.rpc("confirm_appointment", {
    p_id: input.appointmentId,
    p_via: input.via,
  });
  return error ? fail(error) : { ok: true, data };
}

/** El personal aprueba o rechaza una reserva pendiente. */
export async function decidePending(
  db: DbClient,
  input: { appointmentId: string; approve: boolean },
): R<Appointment> {
  const { data, error } = await db.rpc("decide_pending", {
    p_id: input.appointmentId,
    p_approve: input.approve,
  });
  return error ? fail(error) : { ok: true, data };
}

/** Vino o no vino. Cada inasistencia suma al contador del cliente. */
export async function markAttendance(
  db: DbClient,
  input: { appointmentId: string; attended: boolean },
): R<Appointment> {
  const { data, error } = await db.rpc("mark_attendance", {
    p_id: input.appointmentId,
    p_attended: input.attended,
  });
  return error ? fail(error) : { ok: true, data };
}

/** El administrador reinicia el contador de inasistencias y quita la marca de aprobación. */
export async function resetNoShows(db: DbClient, customerId: string): R<null> {
  const { error } = await db.rpc("reset_no_shows", { p_customer_id: customerId });
  return error ? fail(error) : { ok: true, data: null };
}

/** Citas que ocupan un periodo de un barbero. */
export async function listConflictingAppointments(
  db: DbClient,
  input: { barberId: string; startsAt: string; endsAt: string },
): R<ConflictingAppointment[]> {
  const { data, error } = await db.rpc("list_conflicting_appointments", {
    p_barber_id: input.barberId,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
  });
  return error ? fail(error) : { ok: true, data };
}

/**
 * Crea un bloqueo y devuelve las citas que quedaron debajo, para que el barbero las mueva o
 * las cancele (docs/09). El bloqueo no espera a que se resuelvan.
 */
export async function blockTime(
  db: DbClient,
  input: { barberId: string; startsAt: string; endsAt: string; reason?: string },
): Promise<
  Result<
    { timeOff: TimeOff; conflicts: ConflictingAppointment[] },
    BookingErrorCode | BarbersErrorCode
  >
> {
  const created = await createTimeOff(db, input);
  if (!created.ok) {
    return { ok: false, error: created.error };
  }
  const conflicts = await listConflictingAppointments(db, input);
  if (!conflicts.ok) {
    return conflicts;
  }
  return { ok: true, data: { timeOff: created.data, conflicts: conflicts.data } };
}

/** Contrato para notifications. Exige el cliente con la clave secreta (`@possos/supabase/admin`). */
export async function getAppointmentForNotification(
  db: DbClient,
  appointmentId: string,
): R<AppointmentForNotification | null> {
  const { data, error } = await db.rpc("get_appointment_for_notification", { p_id: appointmentId });
  return error ? fail(error) : { ok: true, data: data[0] ?? null };
}

/**
 * La próxima cita de un cliente que todavía no pasa (pendiente, reservada o confirmada), o null.
 * La usa F3 para no borrar una cuenta con una cita pendiente, y F5 para "Mis citas".
 */
export async function getNextAppointment(db: DbClient, customerId: string): R<Appointment | null> {
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("appointments")
    .select("*")
    .eq("customer_id", customerId)
    .in("status", UPCOMING_STATUSES)
    // Que no termine antes de ahora: el rango no queda estrictamente a la izquierda de `now`.
    .not("period", "sl", `[${now},${now}]`)
    .order("period", { ascending: true })
    .limit(1)
    .maybeSingle();
  return error ? fail(error) : { ok: true, data };
}

// ---------------------------------------------------------------------------------------------
// Mis citas (F5): las citas del cliente de la sesión, con nombres aunque el servicio o el barbero
// estén inactivos y el límite para cambiarlas que calcula la base (list_my_appointments).
// ---------------------------------------------------------------------------------------------

type MyAppointmentRow = Database["public"]["Functions"]["list_my_appointments"]["Returns"][number];

function toMyAppointment(row: MyAppointmentRow): MyAppointment | null {
  const start = normalizeInstant(row.start_at);
  const end = normalizeInstant(row.end_at);
  const deadline = normalizeInstant(row.change_deadline);
  if (!start || !end || !deadline) return null;
  return {
    id: row.id,
    status: row.status,
    start,
    end,
    serviceId: row.service_id,
    serviceName: row.service_name,
    serviceActive: row.service_active,
    barberId: row.barber_id,
    barberName: row.barber_name,
    barberActive: row.barber_active,
    // El tipo generado no marca como null las columnas de una función; en la base sí pueden serlo.
    barberWhatsappUrl: (row.barber_whatsapp_url as string | null) ?? null,
    priceCop: (row.price_cop as number | null) ?? null,
    changeDeadline: deadline,
    replacedBy: (row.replaced_by as string | null) ?? null,
  };
}

/**
 * Citas del cliente de la sesión, la más nueva primero, sin las que se reprogramaron (las
 * reemplaza la nueva). Para otra sesión (personal sin perfil de cliente) devuelve una lista vacía.
 */
export async function listMyAppointments(
  db: DbClient,
  input: { limit?: number } = {},
): R<MyAppointment[]> {
  const { data, error } = await db.rpc("list_my_appointments", { p_limit: input.limit ?? 50 });
  if (error) return fail(error);
  return { ok: true, data: data.map(toMyAppointment).filter((a) => a !== null) };
}

/**
 * Una cita del cliente de la sesión, también si se reprogramó (`replacedBy` dice cuál la
 * reemplazó). Null si no existe o es de otro cliente: nunca datos de otro (regla 7).
 */
export async function getMyAppointment(db: DbClient, id: string): R<MyAppointment | null> {
  const { data, error } = await db.rpc("list_my_appointments", { p_id: id });
  if (error) return fail(error);
  const row = data[0];
  return { ok: true, data: row ? toMyAppointment(row) : null };
}

// ---------------------------------------------------------------------------------------------
// Panel (F6): la agenda del personal. RLS deja ver las citas de su agenda al barbero y todas
// al administrador; el nombre y el celular del cliente salen de customers por la clave foránea.
// ---------------------------------------------------------------------------------------------

const AGENDA_SELECT =
  "id, barber_id, status, period, price_cop, source, service_id, customer_id, " +
  "customers(full_name, phone), services(name)";

interface AgendaRow {
  id: string;
  barber_id: string;
  status: AppointmentStatus;
  period: unknown;
  price_cop: number | null;
  source: string;
  service_id: string;
  customer_id: string;
  customers: { full_name: string; phone: string | null } | null;
  services: { name: string } | null;
}

function toAgendaAppointment(row: AgendaRow): AgendaAppointment | null {
  const period = parsePeriod(row.period);
  if (!period) return null;
  return {
    id: row.id,
    barberId: row.barber_id,
    status: row.status,
    start: period.start,
    end: period.end,
    priceCop: row.price_cop,
    serviceId: row.service_id,
    serviceName: row.services?.name ?? "",
    customerId: row.customer_id,
    customerName: row.customers?.full_name ?? "",
    customerPhone: row.customers?.phone ?? null,
    source: row.source === "customer" ? "customer" : "staff",
  };
}

const toAgenda = (rows: unknown[]) =>
  (rows as AgendaRow[]).map(toAgendaAppointment).filter((a) => a !== null);

/** Citas que ocupan la agenda de un barbero entre `from` y `to` (ISO), en orden. */
export async function listAgenda(
  db: DbClient,
  input: { barberId: string; from: string; to: string },
): R<AgendaAppointment[]> {
  const { data, error } = await db
    .from("appointments")
    .select(AGENDA_SELECT)
    .eq("barber_id", input.barberId)
    .in("status", OCCUPYING_STATUSES)
    .overlaps("period", `[${input.from},${input.to})`)
    .order("period");
  return error ? fail(error) : { ok: true, data: toAgenda(data) };
}

/**
 * "Por cerrar": citas que ya empezaron y siguen reservadas o confirmadas, de los últimos
 * `days` días.
 */
export async function listToClose(
  db: DbClient,
  input: { barberId: string; now?: Date; days?: number },
): R<AgendaAppointment[]> {
  const now = input.now ?? new Date();
  const since = new Date(now.getTime() - (input.days ?? 30) * 86_400_000).toISOString();
  const at = now.toISOString();
  const { data, error } = await db
    .from("appointments")
    .select(AGENDA_SELECT)
    .eq("barber_id", input.barberId)
    .in("status", ["booked", "confirmed"])
    // Empezó a más tardar ahora y terminó después de `since`.
    .not("period", "sr", `[${at},${at}]`)
    .not("period", "sl", `[${since},${since}]`)
    .order("period");
  return error ? fail(error) : { ok: true, data: toAgenda(data) };
}

/** Reservas pendientes de aprobar que todavía no pasan. */
export async function listPendingApproval(
  db: DbClient,
  input: { barberId: string; now?: Date },
): R<AgendaAppointment[]> {
  const at = (input.now ?? new Date()).toISOString();
  const { data, error } = await db
    .from("appointments")
    .select(AGENDA_SELECT)
    .eq("barber_id", input.barberId)
    .eq("status", "pending_approval")
    .not("period", "sl", `[${at},${at}]`)
    .order("period");
  return error ? fail(error) : { ok: true, data: toAgenda(data) };
}

/** Una cita del panel con el cliente y el servicio, en cualquier estado, o null. */
export async function getAgendaAppointment(db: DbClient, id: string): R<AgendaAppointment | null> {
  const { data, error } = await db
    .from("appointments")
    .select(AGENDA_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) return fail(error);
  return { ok: true, data: data ? toAgendaAppointment(data as unknown as AgendaRow) : null };
}

/**
 * Inasistencias y marca de aprobación de unos clientes. RLS: el barbero ve las de sus clientes;
 * el administrador, todas. El cliente no ve la suya (docs/06).
 */
export async function listBookingStatus(
  db: DbClient,
  customerIds: string[],
): R<CustomerBookingStatus[]> {
  if (customerIds.length === 0) return { ok: true, data: [] };
  const { data, error } = await db
    .from("customer_booking_status")
    .select("*")
    .in("customer_id", customerIds);
  return error ? fail(error) : { ok: true, data };
}

/** Citas completadas de un barbero desde `since` (ISO), para ver cuáles quedaron sin cobro. */
export async function listCompleted(
  db: DbClient,
  input: { barberId: string; since: string },
): R<AgendaAppointment[]> {
  const { data, error } = await db
    .from("appointments")
    .select(AGENDA_SELECT)
    .eq("barber_id", input.barberId)
    .eq("status", "completed")
    .not("period", "sl", `[${input.since},${input.since}]`)
    .order("period");
  return error ? fail(error) : { ok: true, data: toAgenda(data) };
}

/** Citas del panel por id (las que la sesión ve), en cualquier estado. */
export async function listAgendaByIds(db: DbClient, ids: string[]): R<AgendaAppointment[]> {
  if (ids.length === 0) return { ok: true, data: [] };
  const { data, error } = await db.from("appointments").select(AGENDA_SELECT).in("id", ids);
  return error ? fail(error) : { ok: true, data: toAgenda(data) };
}

/**
 * Historial de citas de un cliente, de la más nueva a la más vieja. RLS: el barbero ve solo las
 * de su agenda; el administrador, todas.
 */
export async function listCustomerAppointments(
  db: DbClient,
  input: { customerId: string; limit?: number },
): R<AgendaAppointment[]> {
  const { data, error } = await db
    .from("appointments")
    .select(AGENDA_SELECT)
    .eq("customer_id", input.customerId)
    .order("period", { ascending: false })
    .limit(input.limit ?? 50);
  return error ? fail(error) : { ok: true, data: toAgenda(data) };
}

/** Reglas de la agenda (una sola fila). Las lee el personal. */
export async function getBookingSettings(db: DbClient): R<BookingSettings> {
  const { data, error } = await db.from("booking_settings").select("*").maybeSingle();
  if (error) return fail(error);
  return data ? { ok: true, data } : { ok: false, error: "NOT_FOUND" };
}

/** Cambia las reglas de la agenda. Solo el administrador (RLS). */
export async function updateBookingSettings(
  db: DbClient,
  patch: ValidBookingSettings,
): R<BookingSettings> {
  const { data, error } = await db
    .from("booking_settings")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", true)
    .select("*")
    .maybeSingle();
  if (error) return fail(error);
  return data ? { ok: true, data } : { ok: false, error: "FORBIDDEN" };
}
