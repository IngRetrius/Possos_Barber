# 09. Modelo de datos inicial en Supabase

Construido en F2 (19/11/2026): las migraciones están en `supabase/migrations/`, una por módulo, y las pruebas en `supabase/tests/database/`. Si este documento y una migración no coinciden, manda la migración y se corrige este documento. Los nombres van en inglés y el esquema es `public`. Cada tabla dice qué módulo es su dueño ([08](08-estructura-monorepo.md), regla 5).

## Diagrama

```
auth.users ─┬─< staff_roles                                  [auth]
            ├── barbers ─┬─< barber_services >── services    [barbers] / [catalog]
            │            │                            └─< service_addons  [catalog]
            │            ├─< working_hours                   [barbers]
            │            ├─< time_off                        [barbers]
            │            └─< portfolio_items                 [barbers]
            ├── customers ─┬─< barber_customers >── barbers  [customers]
            │              └─< customer_notes                [customers]
            └─< push_subscriptions                           [notifications]

appointments  (barber_id, customer_id, service_id)           [booking]
  ├─< appointment_addons >── service_addons                   [booking]
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

Funciones `security definer` con `set search_path = ''`: `is_admin()` y `has_role(role)`, y `delete_my_account()` (F3): el cliente borra su usuario de Auth; el personal recibe `FORBIDDEN`. Desde F6, `list_staff()`, `grant_role(email, role)` y `revoke_role(user_id, role)` para que el administrador asigne y quite roles por correo (no puede leer `auth.users`).

### catalog

| Tabla | Columnas principales |
|---|---|
| `services` | `id`, `name`, `description`, `duration_min` (> 0, múltiplo de 5), `price_cop` (entero ≥ 0; null mientras el dueño no confirme el precio, **[PENDIENTE]**), `active`, `sort_order`, `category` (20/11/2026: grupo con que se muestra en el inicio, por ejemplo "Color de cabello"; null, sin grupo) |
| `service_addons` | 20/11/2026. Adicionales de un servicio (barba, cejas, diseño): `id`, `service_id` → services, `name`, `price_cop` (null, **[PENDIENTE]**), `duration_min` (≥ 0, múltiplo de 5: los minutos que suma), `active`, `sort_order`. Se pueden combinar todos y cada uno suma su precio y sus minutos (decisión del 20/11/2026). Reemplazan los combos de Beunik, cuyo precio era la suma exacta |

### barbers

| Tabla | Columnas principales |
|---|---|
| `barbers` | `id`, `user_id` (único, → auth.users), `display_name`, `bio`, `photo_path`, `active`, `slot_interval_min` (60), `whatsapp_url` |
| `barber_services` | `barber_id`, `service_id`, `price_cop_override`, `duration_min_override`; PK (`barber_id`, `service_id`) |
| `working_hours` | `id`, `barber_id`, `weekday` (1 a 7, ISO), `start_time`, `end_time` (hora local de Bogotá; `end_time > start_time`). Varios rangos por día permiten el almuerzo |
| `time_off` | `id`, `barber_id`, `period` (`tstzrange`), `reason`. Exclusión entre bloqueos del mismo barbero |
| `portfolio_items` | `id`, `barber_id`, `image_path` (Storage), `caption`, `sort_order` |

Función `current_barber_id()`: devuelve el `barbers.id` del usuario actual si tiene el rol `barber`, o null. Vive en la migración de `barbers` porque lee su tabla.

Función `create_time_off(barber_id, starts_at, ends_at, reason)`: la única forma de crear bloqueos (ver abajo, en booking).

Función `get_opening_hours()` (F4): el horario de la barbería para la página pública, que también ven anon y authenticated. Junta los rangos de los barberos activos por día de la semana (los que se cruzan o se tocan quedan en uno) y no dice de quién es cada rango. La tabla `working_hours` sigue visible solo para el barbero y el administrador.

Un trigger impide que un barbero sin rol de administrador cambie su `user_id`, `active` o `slot_interval_min`.

### customers

| Tabla | Columnas principales |
|---|---|
| `customers` | `id`, `user_id` (único y opcional; null si lo creó el personal y la persona no tiene cuenta), `full_name`, `phone` (E.164, `+57...`), `email`, `whatsapp_opt_in`, `data_consent_at`, `data_policy_version`, `created_by`, `created_at` |
| `barber_customers` | `barber_id`, `customer_id`, `first_seen_at`; PK (`barber_id`, `customer_id`). Define qué clientes ve cada barbero |
| `customer_notes` | `id`, `customer_id`, `barber_id`, `body`, `created_at` |

- El registro del cliente en `customers` se crea al completar el perfil, después del registro: nombre, celular y autorización de datos.
- `booking` llama a la función `link_customer_to_barber(customer_id, barber_id)` al crear cada cita. Así `customers` no necesita conocer `appointments` para aplicar su RLS y no se forma un ciclo. Nadie la puede llamar desde la app: un barbero que la llamara podría verse con cualquier cliente.
- El personal crea clientes sin cuenta con `staff_create_customer(full_name, phone, email, whatsapp_opt_in, data_policy_version)`; si quien lo crea es barbero, queda enlazado con él. Desde F6, con `data_policy_version` la base guarda `data_consent_at = now()`: es la autorización que el cliente dio de palabra (Ley 1581). Sin versión, queda sin autorización registrada.
- La restricción `customers_account_has_consent` exige celular, `data_consent_at` y `data_policy_version` a todo perfil con cuenta (Ley 1581). El celular se valida en la base como `+57` y 10 dígitos.
- El cliente solo puede escribir las columnas de su perfil (nombre, celular, correo, WhatsApp y autorización); `user_id` y `created_by` no se tocan desde la app.
- La hora de la autorización la pone la base (F3): cuando el cliente crea su perfil o cambia `data_policy_version`, el trigger `customers_stamp_consent` fija `data_consent_at = now()`, sin importar lo que mande la app. Lo que escribe el personal (clientes sin cuenta) no se toca.
- Cuenta borrada (F3): cuando `user_id` pasa a null porque se borró el usuario de Auth, el perfil queda como "Cuenta borrada", sin celular, correo ni autorizaciones, y se borran las notas del barbero sobre esa persona. La fila se conserva porque las citas y los cobros pasados la referencian.
- La versión vigente de la política es `DATA_POLICY_VERSION` de `@possos/customers`. Si el perfil tiene otra, la app vuelve a pedir la autorización al ingresar.

### booking

| Tabla | Columnas principales |
|---|---|
| `booking_settings` | Una sola fila: `min_lead_min` (60), `max_days_ahead` (30), `cancel_window_min` (120), `no_show_threshold` (2), `timezone` ('America/Bogota') |
| `appointments` | Ver abajo |
| `appointment_addons` | 20/11/2026. Los adicionales de una cita: `appointment_id` → appointments, `addon_id` → service_addons, PK de las dos. La duración (`period`) y el precio (`price_cop`) de la cita ya los incluyen: los calcula `private.booking_offer` al reservar, así que la restricción `no_double_booking` cubre el tiempo completo |
| `customer_booking_status` | `customer_id` (PK), `no_show_count`, `requires_approval`, `updated_at` |
| `booking_events` | `id` (bigserial), `type`, `version`, `appointment_id`, `payload` (jsonb), `created_at` |

```sql
create extension if not exists btree_gist with schema extensions;

create type appointment_status as enum
  ('pending_approval', 'booked', 'confirmed', 'completed', 'no_show', 'cancelled', 'rejected');

create table appointments (
  id               uuid primary key default gen_random_uuid(),
  barber_id        uuid not null references barbers(id),
  customer_id      uuid not null references customers(id),
  service_id       uuid not null references services(id),
  period           tstzrange not null,
  status           appointment_status not null default 'booked',
  price_cop        integer check (price_cop >= 0),            -- precio al reservar; null = [PENDIENTE]
  source           text not null check (source in ('customer', 'staff')),
  auto_assigned    boolean not null default false,             -- "cualquiera disponible"
  created_by       uuid references auth.users(id),
  confirmed_at     timestamptz,
  confirmed_via    text check (confirmed_via in ('customer', 'staff', 'whatsapp')),
  cancelled_by     text check (cancelled_by in ('customer', 'staff')),
  cancel_reason    text,
  rescheduled_from uuid references appointments(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint period_is_half_open
    check (not isempty(period) and lower_inc(period) and not upper_inc(period)
           and not lower_inf(period) and not upper_inf(period)),

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

`create_time_off` (módulo `barbers`) toma el mismo candado, así que las dos operaciones no se cruzan en carreras. Un bloqueo nuevo **sí** puede caer encima de citas ya existentes, porque es decisión del barbero. Como `barbers` no conoce `appointments`, la lista de esas citas sale de `list_conflicting_appointments` (módulo `booking`): `blockTime()` de `@possos/booking/server` llama a las dos y le devuelve al barbero el bloqueo y las citas que debe mover o cancelar.

**Eventos (`booking_events`).** Un trigger `after insert or update` sobre `appointments` publica `appointment.created`, `appointment.rescheduled` (la cita nueva, con `rescheduled_from`), `appointment.cancelled` y `appointment.status_changed` (con `previous_status`). Al reprogramar, la cita anterior se cancela sin evento propio: el consumidor descarta lo programado para `rescheduled_from`. El payload (versión 1) solo lleva identificadores y fechas; su contrato está en `packages/booking/src/events.ts`.

**Broadcast.** Otro trigger publica `slots_changed` en `slots:<barber_id>:<YYYY-MM-DD>` con `realtime.send(..., private => false)` y tolera que falle.

### commissions

Reemplaza las "facturas" de Beunik, que según el dueño (19/11/2026) solo reparten el valor de cada servicio entre el barbero y la barbería con un porcentaje que fija el administrador. **No es factura electrónica de la DIAN.**

| Tabla | Columnas principales |
|---|---|
| `commission_rates` | `barber_id` (PK), `barber_pct` (`numeric(5,2)`, de 0 a 100), `updated_at`, `updated_by`. Valor inicial: **50** (dueño, 19/11/2026: hoy usa 50 % para todos los servicios) |
| `charges` | `id`, `appointment_id` (único, → appointments), `barber_id`, `service_id`, `amount_cop` (entero ≥ 0, lo que se cobró), `barber_pct` (copia del porcentaje vigente al cobrar), `barber_amount_cop` (generada: `round(amount_cop * barber_pct / 100)`), `business_amount_cop` (generada: `amount_cop - barber_amount_cop`), `charged_at`, `created_by`, `voided_at`, `void_reason` |

- Un cobro por cita `completed`. El monto llega prellenado con `appointments.price_cop` y se puede cambiar, porque lo cobrado puede diferir de lo reservado.
- El porcentaje se copia en cada cobro: cambiarlo no altera liquidaciones pasadas.
- Solo servicios; los productos no entran (los productos son de la fase 3).
- `booking` no conoce este módulo. `commissions` lee la cita con `private.booking_appointment(id)`, la API de lectura de `booking` para SQL, y no escribe en sus tablas.
- Para registrar cobros, el barbero necesita su fila en `commission_rates`; si falta, `record_charge` devuelve `NO_COMMISSION_RATE`. No hay valor por omisión en el código: el 50 % lo pone la semilla en local y el script del primer administrador en producción (F3).
- Las fechas de corrección (mismo día) y de liquidación se calculan en hora de Bogotá.

### notifications

| Tabla | Columnas principales |
|---|---|
| `notification_settings` | Una sola fila: `reminder_offsets_min` (`{1440, 120}`), `send_confirmation` (true), `send_cancellation` (F7, false: aviso `cita_cancelada` cuando el personal cancela, decisión 7 de [10](10-riesgos-decisiones-abiertas.md)) |
| `message_jobs` | `id`, `appointment_id`, `kind` (`confirmation` \| `reminder` \| `cancellation`), `offset_min`, `channel` (`whatsapp` \| `push`), `send_at`, `status` (`scheduled` \| `sending` \| `sent` \| `delivered` \| `read` \| `failed` \| `skipped`), `provider_message_id` (único), `attempts`, `last_error`. Desde F7: `template` (la plantilla de Meta que se manda), `sent_at` (cuando la Cloud API aceptó el mensaje), `status_at` (último estado del webhook) y `pricing_category` (categoría con que Meta lo cobró). Único (`appointment_id`, `kind`, `offset_min`, `channel`) |
| `inbound_messages` | `id`, `provider_message_id` (único, para no procesar dos veces), `from_phone`, `button_payload`, `appointment_id`, `payload`, `received_at` |
| `push_subscriptions` | `id`, `user_id`, `endpoint` (único), `p256dh`, `auth`, `created_at` |
| `event_cursors` | `consumer` (PK: `push` desde F8, `whatsapp` desde F7), `last_event_id`, `lease_until` (turno del despacho que lo procesa), `updated_at` |

Reglas del despacho:
- Cada consumidor lee `booking_events` con su propio cursor: `claim_booking_events` toma el turno y los eventos pendientes, `ack_booking_events` avanza el cursor y suelta el turno. Entrega al menos una vez y en orden; un consumidor debe tolerar ver un evento dos veces.
- El cursor no salta un id que falta si el evento siguiente tiene menos de 2 minutos: puede ser una reserva que todavía no termina (los ids salen al insertar, pero las transacciones terminan en otro orden). Pasados 2 minutos, el hueco es una transacción deshecha y se salta.
- El despacho lo dispara la base (F8, ver [07](07-stack.md#decisiones-y-alternativas-descartadas)): un trigger de `notifications` sobre `booking_events` hace un POST con `pg_net` a `/api/notifications/dispatch` con cada transacción que publica eventos, y `pg_cron` revisa cada minuto si algún consumidor quedó atrás. La URL y el secreto están en Supabase Vault (`notifications_dispatch_url`, `notifications_dispatch_secret`).
- Push (F8): un aviso al barbero de la cita por cada reserva, cambio, confirmación o cancelación hecha por el cliente (no por el personal). Sin el celular del cliente.
- WhatsApp (F7): el consumidor `whatsapp` crea los `message_jobs` al procesar `appointment.created` (o la aprobación de una pendiente, o la cita nueva de una reprogramación): la confirmación ya y un recordatorio por cada minuto de `reminder_offsets_min` cuya hora no haya pasado. Solo si el cliente aceptó WhatsApp y tiene celular, y solo con Meta configurado.
- Si la cita se cancela, se reprograma, se rechaza o se cierra, los trabajos pendientes pasan a `skipped` (F7).
- `pg_cron` también pide un despacho si hay `message_jobs` de WhatsApp vencidos; la ruta los toma con `claim_message_jobs` (`for update skip locked`: ninguno sale dos veces) y, justo antes de enviar, vuelve a leer la cita. Reintentos con límite; el detalle está en [F7-entrega](../fases/F7-entrega.md).
- Los estados (`sent`, `delivered`, `read`, `failed`) llegan por el webhook de Meta y solo avanzan. Cada mensaje entrante se registra en `inbound_messages` por su id antes de procesarlo, así que un reintento de Meta no confirma ni contesta dos veces.

## Funciones de Postgres (API de escritura)

Todas son `security definer`, con `set search_path = ''`. Validan el rol y la política adentro; el trigger de `appointments` escribe en `booking_events`. Los clientes y el personal no tienen permiso de `insert`, `update` ni `delete` directo sobre `appointments`. Supabase deja ejecutar cualquier función de `public` a `anon` y `authenticated` por omisión, así que cada migración revoca ese permiso y lo concede solo a quien corresponde.

Las funciones internas van en el esquema `private`, que PostgREST no expone; cada módulo les pone su prefijo (`private.booking_check`, ...).

| Función | Quién | Qué hace |
|---|---|---|
| `get_available_slots(service_id, day, barber_id?, addon_ids?)` | anon y authenticated | Devuelve solo `start_at` y `barber_ids` (los barberos libres). Sin datos de clientes. Horas alineadas al `slot_interval_min` del barbero desde el inicio de cada rango del horario. Con `addon_ids`, la duración incluye los adicionales |
| `get_available_days(service_id, barber_id?, addon_ids?)` | anon y authenticated | F4. Cuántas horas libres tiene cada día, de hoy a `max_days_ahead`, para la tira de días. Cuenta lo mismo que `get_available_slots` |
| `my_booking_requires_approval()` | authenticated | F4. Si la próxima reserva del cliente de la sesión quedará `pending_approval`. El cliente no ve su contador de inasistencias (docs/06), solo este aviso |
| `list_my_appointments(id?, limit?)` | authenticated | F5. Las citas del cliente de la sesión (nunca las de otro), con el nombre del servicio y del barbero aunque estén inactivos, los adicionales (`addon_ids`, `addon_names`), el WhatsApp del barbero, `change_deadline` (inicio menos `cancel_window_min`: hasta cuándo puede cancelar o cambiar) y `replaced_by` (la cita que la reemplazó al reprogramarla). Sin `id`, deja fuera las reprogramadas. El personal sin perfil de cliente recibe una lista vacía |
| `book_appointment(service_id, start_at, barber_id?, addon_ids?)` | cliente | Aplica anticipación y horario, resuelve "cualquiera disponible", pone `pending_approval` si el cliente lo requiere y enlaza el cliente con el barbero. Un adicional inactivo o de otro servicio da `SERVICE_NOT_AVAILABLE` |
| `staff_create_appointment(customer_id, service_id, barber_id, start_at, addon_ids?)` | barbero (su agenda) y admin | Igual, sin las reglas de anticipación ni la alineación al intervalo; la cita sí debe caber en el horario. El barbero solo agenda a clientes que ya ve |
| `cancel_appointment(id, reason)` | cliente (dentro de la ventana), barbero y admin | El personal debe dar un motivo |
| `reschedule_appointment(id, new_start_at, new_barber_id?)` | cliente (dentro de la ventana), barbero y admin | Crea la nueva y cancela la anterior en una sola transacción. La nueva lleva los mismos adicionales |
| `confirm_appointment(id, via)` | cliente, barbero, admin y el servicio de notificaciones | `via`: `customer`, `staff` o `whatsapp`. Confirmar dos veces no es error |
| `decide_pending(id, approve)` | barbero y admin | |
| `mark_attendance(id, attended)` | barbero y admin | Solo después de la hora de inicio. Actualiza `customer_booking_status` |
| `reset_no_shows(customer_id)` | admin | |
| `list_conflicting_appointments(barber_id, starts_at, ends_at)` | barbero (su agenda) y admin | Citas que ocupan ese periodo, con el nombre del cliente |
| `set_working_hours(barber_id, ranges)` | barbero (el suyo) y admin | F6. Módulo `barbers`. Reemplaza el horario semanal completo en una transacción |
| `staff_create_customer(full_name, phone, email, whatsapp_opt_in, data_policy_version)` | barbero y admin | Módulo `customers`. Cliente sin cuenta; con la versión de la política guarda la hora de la autorización de palabra (F6) |
| `get_appointment_for_notification(id)` | solo service role | Contrato público para `notifications`: fecha, servicio (con sus adicionales: "Corte + Barba"), barbero, nombre, celular y opt-in |
| `claim_booking_events(consumer, limit?)` | solo service role | F8. Módulo `notifications`. Toma el turno del consumidor y devuelve sus eventos pendientes en orden, sin pasar un hueco reciente. `BUSY` si otro despacho tiene el turno (vence al minuto) |
| `ack_booking_events(consumer, last_event_id?)` | solo service role | F8. Avanza el cursor (null: no avanza), suelta el turno y dice si quedan eventos |
| `save_push_subscription(endpoint, p256dh, auth)` | barbero | F8. Guarda la suscripción push del navegador para la cuenta de la sesión. Si el endpoint ya estaba con otra cuenta (otra persona en el mismo celular), pasa a la de ahora |
| `list_push_targets(barber_id)` | solo service role | F8. Las suscripciones de la cuenta de un barbero activo y con el rol |
| `claim_message_jobs(limit?)` | solo service role | F7. Módulo `notifications`. Toma los trabajos de WhatsApp vencidos (y los colgados en `sending` más de 5 minutos) con `for update skip locked` y los pasa a `sending` con un intento más |
| `finish_message_job(id, outcome, provider_message_id?, error?, retry_at?)` | solo service role | F7. `sent`, `retry` (vuelve a `scheduled`), `failed` o `skipped`. Solo cambia filas en `sending` |
| `record_message_status(provider_message_id, status, at?, error?, pricing_category?)` | solo service role | F7. Estado del webhook; solo avanza. Devuelve la cita del mensaje o null |
| `find_appointment_for_phone(phone)` | solo service role | F7. Módulo `booking`. La próxima cita activa de un celular `+57...` o, si no tiene, la última: para contestar un texto libre con el WhatsApp de su barbero |
| `record_charge(appointment_id, amount_cop)` | barbero (su agenda) y admin | Módulo `commissions`. Exige la cita en `completed` y sin cobro previo; copia el porcentaje vigente |
| `update_charge(id, amount_cop)` | barbero (sus cobros del mismo día) y admin | Corrige el monto; el porcentaje copiado no cambia |
| `void_charge(id, reason)` | admin | Anula un cobro con motivo; no se borra |
| `delete_my_account()` | cliente | Módulo `auth`. Borra su usuario de Auth; `customers` anonimiza el perfil. El personal recibe `FORBIDDEN`. La app no la llama si el cliente tiene una cita próxima |
| `list_staff()` | admin | F6. Módulo `auth`. Correo y roles de cada cuenta del personal |
| `grant_role(email, role)` | admin | F6. Da un rol por correo (sin importar mayúsculas). `USER_NOT_FOUND` si no hay cuenta. Dar dos veces el mismo rol no es error |
| `revoke_role(user_id, role)` | admin | F6. Quita un rol. Nadie se quita a sí mismo el de administrador (`CANNOT_REVOKE_SELF`), así que siempre queda uno |
| `get_settlement(from, to, barber_id?)` | barbero (solo el suyo) y admin | Totales del periodo (fechas de Bogotá, ambas incluidas), una fila por barbero: servicios, cobrado, parte del barbero y parte de la barbería, sin los anulados |

Los errores salen como excepción con el código en el mensaje (SQLSTATE `P0001`). Cada paquete los traduce con `errorCode()` de `@possos/supabase` y su función de textos (`bookingErrorMessage`, ...); los textos están en [11](11-interfaz.md#textos-de-la-interfaz).

| Módulo | Códigos |
|---|---|
| booking | `SLOT_TAKEN`, `TOO_LATE_TO_CANCEL`, `OUTSIDE_WORKING_HOURS`, `IN_TIME_OFF`, `TOO_SOON`, `TOO_FAR`, `SERVICE_NOT_AVAILABLE`, `NO_CUSTOMER_PROFILE`, `NOT_AUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `INVALID_STATUS`, `INVALID_INPUT`, `INVALID_PERIOD`, `REASON_REQUIRED`, `NOT_STARTED` |
| barbers | `NOT_AUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `INVALID_PERIOD`, `TIME_OFF_OVERLAP`, `HOURS_OVERLAP`, `INVALID_INPUT` |
| auth | `NOT_AUTHENTICATED`, `FORBIDDEN` (`delete_my_account`); `USER_NOT_FOUND`, `CANNOT_REVOKE_SELF` e `INVALID_INPUT` (roles, F6). Los errores de Supabase Auth (ingreso, registro, contraseña) los traduce `authErrorCode` de `@possos/auth` |
| customers | `NOT_AUTHENTICATED`, `FORBIDDEN`, `INVALID_CUSTOMER`. En la app, además, `CONSENT_REQUIRED` |
| commissions | `NOT_AUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `NOT_COMPLETED`, `ALREADY_CHARGED`, `INVALID_AMOUNT`, `NO_COMMISSION_RATE`, `TOO_LATE_TO_EDIT`, `INVALID_STATUS`, `INVALID_PERIOD`, `REASON_REQUIRED` |
| notifications | `NOT_AUTHENTICATED`, `FORBIDDEN`, `INVALID_INPUT` (`save_push_subscription`); `BUSY` e `INVALID_INPUT` (`claim_booking_events`, solo el servidor); `INVALID_INPUT` (`finish_message_job` y `record_message_status`, F7, solo el servidor) |

Una reserva de un cliente con 2 inasistencias no es un error: entra como `pending_approval` y la interfaz muestra "Tu reserva queda pendiente de que el barbero la apruebe".

## Políticas RLS principales

RLS está activado en todas las tablas. Resumen:

| Tabla | select | insert, update, delete |
|---|---|---|
| `services`, `portfolio_items` | todos (si están activos), admin todo | admin (portafolio: también su barbero) |
| `service_addons` | todos (si están activos); el personal también los inactivos, para no perder nombres en la agenda | admin |
| `appointment_addons` | quien ve la cita | **ninguno** (solo funciones) |
| `barbers` | todos los activos; admin todo; el barbero se ve a sí mismo | admin; el barbero actualiza su perfil |
| `working_hours`, `time_off` | su barbero y admin | su barbero y admin (los bloqueos, por función) |
| `staff_roles` | lo propio; admin todo | admin |
| `customers` | lo propio; el barbero si existe `barber_customers`; admin | lo propio (solo las columnas del perfil); el personal edita clientes sin cuenta (`user_id is null`) que ve y los crea con `staff_create_customer` |
| `customer_notes` | barbero dueño de la nota y admin | barbero dueño de la nota y admin |
| `appointments` | cliente: las suyas; barbero: las de su agenda; admin todo | **ninguno** (solo funciones) |
| `customer_booking_status` | barbero (sus clientes) y admin | ninguno (solo funciones) |
| `booking_settings`, `notification_settings` | authenticated | admin |
| `message_jobs` | barbero (citas de su agenda) y admin | ninguno (solo el servidor) |
| `booking_events`, `inbound_messages`, `event_cursors` | ninguno | ninguno (solo service role) |
| `push_subscriptions` | lo propio | lo propio (guardar, con `save_push_subscription`, solo un barbero) |
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

- Agenda del barbero: Postgres Changes sobre `appointments`, filtrado por `barber_id`. RLS solo le deja ver la suya. La tabla entra en la publicación `supabase_realtime` con la migración `20261119160000_booking_realtime.sql` (F6). El panel no usa la fila que llega (no trae nombres): vuelve a pedir la agenda al servidor.
- Horas libres para el cliente: un trigger publica un aviso por Broadcast en `slots:<barber_id>:<fecha>` sin datos personales, y la pantalla vuelve a pedir `get_available_slots`. Ver [07](07-stack.md).

## Pruebas obligatorias (pgTAP)

Están en `supabase/tests/database/` (`02_booking`, `03_rls`, `04_commissions` y, desde F3, `05_accounts`: perfil, autorización y borrar la cuenta; F4 agregó `06_reserva`, F5 `08_mis_citas` y F6 `07_panel`: Realtime, horario semanal, cliente creado por el personal, roles y la matriz de docs/06 del barbero frente al administrador; el 20/11/2026, `10_adicionales`: suma de precio y minutos, horas libres con la barba, la restricción de exclusión sobre el tiempo extra, reprogramar con los mismos adicionales y RLS; y F7, `11_whatsapp`: las funciones del despacho y `get_appointment_for_notification` solo para la service role, RLS de las tablas que cambiaron, `claim_message_jobs` sin dobles, los estados que solo avanzan y el respaldo de `pg_cron`), con el fixture compartido `supabase/tests/fixtures/setup.psql`. Cada prueba obligatoria lleva su número al inicio de la descripción.

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
