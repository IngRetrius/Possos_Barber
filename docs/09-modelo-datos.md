# 09. Modelo de datos inicial en Supabase

Es una propuesta para la primera migración. Los nombres van en inglés y el esquema es `public`. Cada tabla dice qué módulo es su dueño ([08](08-estructura-monorepo.md), regla 5).

## Diagrama

```
auth.users ─┬─< staff_roles                                  [auth]
            ├── barbers ─┬─< barber_services >── services    [barbers] / [catalog]
            │            ├─< working_hours                   [barbers]
            │            ├─< time_off                        [barbers]
            │            └─< portfolio_items                 [barbers]
            ├── customers ─┬─< barber_customers >── barbers  [customers]
            │              └─< customer_notes                [customers]
            └─< push_subscriptions                           [notifications]

appointments  (barber_id, customer_id, service_id)           [booking]
  ├── customer_booking_status (por customer_id)              [booking]
  ├── booking_events                                          [booking]
  ├─< message_jobs                                            [notifications]
  └── charges (uno por cita completed)                        [commissions]
commission_rates (por barber_id)                              [commissions]
booking_settings, notification_settings (una sola fila)
inbound_messages, event_cursors                               [notifications]
```

## Tablas

### auth

| Tabla | Columnas principales |
|---|---|
| `staff_roles` | `user_id` → auth.users, `role` (`admin` \| `barber`), PK (`user_id`, `role`) |

Funciones `security definer` con `set search_path = ''`: `is_admin()` y `has_role(role)`.

### catalog

| Tabla | Columnas principales |
|---|---|
| `services` | `id`, `name`, `description`, `duration_min` (> 0, múltiplo de 5), `price_cop` (entero ≥ 0), `active`, `sort_order` |

### barbers

| Tabla | Columnas principales |
|---|---|
| `barbers` | `id`, `user_id` (único, → auth.users), `display_name`, `bio`, `photo_path`, `active`, `slot_interval_min` (60), `whatsapp_url` |
| `barber_services` | `barber_id`, `service_id`, `price_cop_override`, `duration_min_override`; PK (`barber_id`, `service_id`) |
| `working_hours` | `id`, `barber_id`, `weekday` (1 a 7, ISO), `start_time`, `end_time` (hora local de Bogotá; `end_time > start_time`). Varios rangos por día permiten el almuerzo |
| `time_off` | `id`, `barber_id`, `period` (`tstzrange`), `reason`. Exclusión entre bloqueos del mismo barbero |
| `portfolio_items` | `id`, `barber_id`, `image_path` (Storage), `caption`, `sort_order` |

Función `current_barber_id()`: devuelve el `barbers.id` del usuario actual, o null.

### customers

| Tabla | Columnas principales |
|---|---|
| `customers` | `id`, `user_id` (único y opcional; null si lo creó el personal y la persona no tiene cuenta), `full_name`, `phone` (E.164, `+57...`), `email`, `whatsapp_opt_in`, `data_consent_at`, `data_policy_version`, `created_by`, `created_at` |
| `barber_customers` | `barber_id`, `customer_id`, `first_seen_at`; PK (`barber_id`, `customer_id`). Define qué clientes ve cada barbero |
| `customer_notes` | `id`, `customer_id`, `barber_id`, `body`, `created_at` |

- El registro del cliente en `customers` se crea al completar el perfil, después del registro: nombre, celular y autorización de datos.
- `booking` llama a la función pública `link_customer_to_barber(customer_id, barber_id)` al crear cada cita. Así `customers` no necesita conocer `appointments` para aplicar su RLS y no se forma un ciclo.

### booking

| Tabla | Columnas principales |
|---|---|
| `booking_settings` | Una sola fila: `min_lead_min` (60), `max_days_ahead` (30), `cancel_window_min` (120), `no_show_threshold` (2), `timezone` ('America/Bogota') |
| `appointments` | Ver abajo |
| `customer_booking_status` | `customer_id` (PK), `no_show_count`, `requires_approval`, `updated_at` |
| `booking_events` | `id` (bigserial), `type`, `version`, `appointment_id`, `payload` (jsonb), `created_at` |

```sql
create extension if not exists btree_gist;

create type appointment_status as enum
  ('pending_approval', 'booked', 'confirmed', 'completed', 'no_show', 'cancelled', 'rejected');

create table appointments (
  id               uuid primary key default gen_random_uuid(),
  barber_id        uuid not null references barbers(id),
  customer_id      uuid not null references customers(id),
  service_id       uuid not null references services(id),
  period           tstzrange not null,
  status           appointment_status not null default 'booked',
  price_cop        integer not null check (price_cop >= 0),   -- precio al momento de reservar
  source           text not null check (source in ('customer', 'staff')),
  auto_assigned    boolean not null default false,             -- "cualquiera disponible"
  created_by       uuid references auth.users(id),
  confirmed_at     timestamptz,
  cancelled_by     text check (cancelled_by in ('customer', 'staff')),
  cancel_reason    text,
  rescheduled_from uuid references appointments(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint period_is_half_open
    check (not isempty(period) and lower_inc(period) and not upper_inc(period)),

  -- La garantía central: un barbero no puede tener dos citas que se crucen.
  constraint no_double_booking
    exclude using gist (barber_id with =, period with &&)
    where (status not in ('cancelled', 'rejected'))
);

create index on appointments (customer_id);
create index on appointments using gist (period);
```

**Bloqueos (`time_off`).** Un trigger `before insert or update of period, barber_id` sobre `appointments` hace dos cosas:

1. Bloquea la fila del barbero (`select 1 from barbers where id = new.barber_id for update`).
2. Rechaza la cita si se cruza con un `time_off` de ese barbero.

La función que crea bloqueos toma el mismo candado, así que las dos operaciones no se cruzan en carreras. Un bloqueo nuevo **sí** puede caer encima de citas ya existentes, porque es decisión del barbero; la función le devuelve la lista de esas citas para que las mueva o las cancele.

### commissions

Reemplaza las "facturas" de Beunik, que según el dueño (19/11/2026) solo reparten el valor de cada servicio entre el barbero y la barbería con un porcentaje que fija el administrador. **No es factura electrónica de la DIAN.**

| Tabla | Columnas principales |
|---|---|
| `commission_rates` | `barber_id` (PK), `barber_pct` (`numeric(5,2)`, de 0 a 100), `updated_at`, `updated_by`. Valor inicial: **50** (dueño, 19/11/2026: hoy usa 50 % para todos los servicios) |
| `charges` | `id`, `appointment_id` (único, → appointments), `barber_id`, `service_id`, `amount_cop` (entero ≥ 0, lo que se cobró), `barber_pct` (copia del porcentaje vigente al cobrar), `barber_amount_cop` (generada: `round(amount_cop * barber_pct / 100)`), `business_amount_cop` (generada: `amount_cop - barber_amount_cop`), `charged_at`, `created_by`, `voided_at`, `void_reason` |

- Un cobro por cita `completed`. El monto llega prellenado con `appointments.price_cop` y se puede cambiar, porque lo cobrado puede diferir de lo reservado.
- El porcentaje se copia en cada cobro: cambiarlo no altera liquidaciones pasadas.
- Solo servicios; los productos no entran (los productos son de la fase 3).
- `booking` no conoce este módulo. `commissions` lee la cita por la API pública de `booking` y no escribe en sus tablas.

### notifications

| Tabla | Columnas principales |
|---|---|
| `notification_settings` | Una sola fila: `reminder_offsets_min` (`{1440, 120}`), `send_confirmation` (true) |
| `message_jobs` | `id`, `appointment_id`, `kind` (`confirmation` \| `reminder` \| `cancellation`), `offset_min`, `channel` (`whatsapp` \| `push`), `send_at`, `status` (`scheduled` \| `sending` \| `sent` \| `delivered` \| `read` \| `failed` \| `skipped`), `provider_message_id` (único), `attempts`, `last_error`. Único (`appointment_id`, `kind`, `offset_min`, `channel`) |
| `inbound_messages` | `id`, `provider_message_id` (único, para no procesar dos veces), `from_phone`, `button_payload`, `appointment_id`, `payload`, `received_at` |
| `push_subscriptions` | `id`, `user_id`, `endpoint` (único), `p256dh`, `auth`, `created_at` |
| `event_cursors` | `consumer` (PK), `last_event_id` |

Reglas del despacho:
- Al procesar `appointment.created` se crean los `message_jobs`.
- Si la cita se cancela o se reprograma, los trabajos pendientes pasan a `skipped`.
- Justo antes de enviar, se vuelve a leer el estado de la cita.

## Funciones de Postgres (API de escritura)

Todas son `security definer`, con `set search_path = ''`. Validan el rol y la política adentro y escriben en `booking_events`. Los clientes y el personal no tienen permiso de `insert`, `update` ni `delete` directo sobre `appointments`.

| Función | Quién | Qué hace |
|---|---|---|
| `get_available_slots(service_id, barber_id?, date)` | anon y authenticated | Devuelve solo `start_at` y los barberos libres. Sin datos de clientes |
| `book_appointment(service_id, barber_id?, start_at)` | cliente | Aplica anticipación y horario, resuelve "cualquiera disponible", pone `pending_approval` si el cliente lo requiere y enlaza el cliente con el barbero |
| `staff_create_appointment(customer_id, service_id, barber_id, start_at)` | barbero (su agenda) y admin | Igual, sin las reglas de anticipación |
| `cancel_appointment(id, reason)` | cliente (dentro de la ventana), barbero y admin | |
| `reschedule_appointment(id, new_start_at, new_barber_id?)` | cliente (dentro de la ventana), barbero y admin | Crea la nueva y cancela la anterior en una sola transacción |
| `confirm_appointment(id, via)` | cliente, barbero, admin y el servicio de notificaciones | |
| `decide_pending(id, approve)` | barbero y admin | |
| `mark_attendance(id, attended)` | barbero y admin | Actualiza `customer_booking_status` |
| `reset_no_shows(customer_id)` | admin | |
| `get_appointment_for_notification(id)` | solo service role | Contrato público para `notifications`: fecha, servicio, barbero, nombre, celular y opt-in |
| `record_charge(appointment_id, amount_cop)` | barbero (su agenda) y admin | Módulo `commissions`. Exige la cita en `completed` y sin cobro previo; copia el porcentaje vigente |
| `update_charge(id, amount_cop)` | barbero (sus cobros del mismo día) y admin | Corrige el monto; el porcentaje copiado no cambia |
| `void_charge(id, reason)` | admin | Anula un cobro con motivo; no se borra |
| `get_settlement(barber_id?, from, to)` | barbero (solo el suyo) y admin | Totales del periodo: servicios, cobrado, parte del barbero y parte de la barbería, sin los anulados |

Los errores se devuelven con códigos estables (`SLOT_TAKEN`, `OUTSIDE_HOURS`, `TOO_LATE_TO_CANCEL`, `NEEDS_APPROVAL`…) que la interfaz traduce al español.

## Políticas RLS principales

RLS está activado en todas las tablas. Resumen:

| Tabla | select | insert, update, delete |
|---|---|---|
| `services`, `portfolio_items` | todos (si están activos), admin todo | admin (portafolio: también su barbero) |
| `barbers` | todos los activos; admin todo; el barbero se ve a sí mismo | admin; el barbero actualiza su perfil |
| `working_hours`, `time_off` | su barbero y admin | su barbero y admin (los bloqueos, por función) |
| `staff_roles` | lo propio; admin todo | admin |
| `customers` | lo propio; el barbero si existe `barber_customers`; admin | lo propio; el personal crea y edita clientes sin cuenta (`user_id is null`) |
| `customer_notes` | barbero dueño de la nota y admin | barbero dueño de la nota y admin |
| `appointments` | cliente: las suyas; barbero: las de su agenda; admin todo | **ninguno** (solo funciones) |
| `customer_booking_status` | barbero (sus clientes) y admin | ninguno (solo funciones) |
| `booking_settings`, `notification_settings` | authenticated | admin |
| `message_jobs` | barbero (citas de su agenda) y admin | ninguno (solo el servidor) |
| `booking_events`, `inbound_messages`, `event_cursors` | ninguno | ninguno (solo service role) |
| `push_subscriptions` | lo propio | lo propio |
| `commission_rates` | su barbero y admin | admin |
| `charges` | su barbero y admin | ninguno (solo funciones) |

```sql
-- Ejemplo: un barbero solo ve a sus clientes; un cliente se ve a sí mismo; el admin ve todos.
create policy customers_select on customers for select to authenticated using (
  user_id = (select auth.uid())
  or (select is_admin())
  or exists (
    select 1 from barber_customers bc
    where bc.customer_id = customers.id
      and bc.barber_id = (select current_barber_id())
  )
);

-- Ejemplo: citas visibles para el cliente dueño, su barbero o el admin.
create policy appointments_select on appointments for select to authenticated using (
  customer_id in (select id from customers where user_id = (select auth.uid()))
  or barber_id = (select current_barber_id())
  or (select is_admin())
);
```

Envolver `auth.uid()` y las funciones en `(select ...)` hace que Postgres las evalúe una sola vez por consulta y no una vez por fila.

## Storage

- `barber-photos` y `portfolio`: lectura pública. Escriben el admin o el barbero dueño de la carpeta `<barber_id>/`, controlado con políticas sobre `storage.objects` según el prefijo de la ruta.

## Realtime

- Agenda del barbero: Postgres Changes sobre `appointments`, filtrado por `barber_id`. RLS solo le deja ver la suya.
- Horas libres para el cliente: un trigger publica un aviso por Broadcast en `slots:<barber_id>:<fecha>` sin datos personales, y la pantalla vuelve a pedir `get_available_slots`. Ver [07](07-stack.md).

## Pruebas obligatorias (pgTAP)

1. Dos `book_appointment` a la misma hora para el mismo barbero: uno pasa y el otro falla con `SLOT_TAKEN`.
2. Una cita cancelada libera la hora.
3. Las citas seguidas, de 3:00 a 4:00 y de 4:00 a 5:00, no chocan.
4. No se puede reservar dentro de un `time_off`.
5. Un cliente no puede leer citas ni datos de otro cliente.
6. Un barbero no puede leer clientes sin `barber_customers` con él.
7. Cancelar a menos de 2 h devuelve `TOO_LATE_TO_CANCEL` para el cliente y funciona para el personal.
8. Con 2 `no_show`, la siguiente reserva del cliente entra como `pending_approval`.
9. `record_charge` falla si la cita no está `completed` o ya tiene cobro; cambiar el porcentaje no altera cobros anteriores.
10. Un barbero no puede leer cobros de otro barbero ni cambiar su propio porcentaje.
