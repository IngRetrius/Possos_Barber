# F2. Datos y reglas de la agenda

**Estado:** terminada en código el 19/11/2026. Lo que existe y lo que no es evidente está en [F2-entrega.md](F2-entrega.md).

## Objetivo

Que la base de datos tenga todas las tablas del MVP, la restricción que impide dos citas a la vez, RLS en todo y las funciones que usan la interfaz y los recordatorios. Al terminar, las reglas críticas se cumplen aunque la interfaz falle.

**Depende de:** F0. **Toca:** `supabase/migrations`, `supabase/tests`, `supabase/seed.sql` y la API de servidor de `catalog`, `barbers`, `customers`, `booking` y `commissions`.

La especificación está en [docs/09-modelo-datos.md](../docs/09-modelo-datos.md) y las reglas en [docs/04-agendamiento.md](../docs/04-agendamiento.md).

## Tareas

### Migraciones (una por módulo, con su prefijo)

- [x] `auth`: `staff_roles`, `is_admin()` y `has_role()`, más el esquema `private` para funciones internas. `current_barber_id()` quedó en la migración de `barbers`, porque lee su tabla.
- [x] `catalog`: `services`.
- [x] `barbers`: `barbers`, `barber_services`, `working_hours`, `time_off` (con su exclusión) y `portfolio_items`, más `current_barber_id()` y `create_time_off()` con el candado.
- [x] `customers`: `customers`, `barber_customers` y `customer_notes`, más `link_customer_to_barber()` y `staff_create_customer()`.
- [x] `booking`: `booking_settings`, `appointments` con `no_double_booking`, `customer_booking_status`, `booking_events` y el trigger de `time_off` con el candado sobre `barbers`.
- [x] `commissions`: `commission_rates` y `charges`, con las columnas generadas del reparto ([docs/09](../docs/09-modelo-datos.md#commissions)).
- [x] `notifications`: `notification_settings`, `message_jobs`, `inbound_messages`, `push_subscriptions` y `event_cursors` (las tablas; la lógica es de F7).
- [x] RLS activado en todas las tablas de `public`, con las políticas de [docs/09](../docs/09-modelo-datos.md#políticas-rls-principales).
- [x] Storage: `barber-photos` y `portfolio` con políticas por prefijo `<barber_id>/`.

### Funciones

- [x] `get_available_slots(service_id, barber_id?, date)`: horario del día, menos bloqueos, menos citas que ocupan, menos la anticipación mínima, alineado al intervalo y con espacio para la duración. Solo devuelve horas de inicio y barberos libres.
- [x] `book_appointment`, `staff_create_appointment`, `cancel_appointment`, `reschedule_appointment`, `confirm_appointment`, `decide_pending`, `mark_attendance`, `reset_no_shows` y `get_appointment_for_notification`, más `list_conflicting_appointments` (las citas debajo de un bloqueo nuevo).
- [x] `record_charge`, `update_charge`, `void_charge` y `get_settlement` del módulo `commissions`.
- [x] Errores con códigos estables que la interfaz traduce: `SLOT_TAKEN`, `TOO_LATE_TO_CANCEL`, `OUTSIDE_WORKING_HOURS`, `IN_TIME_OFF`, `TOO_SOON`, `TOO_FAR`.
- [x] Trigger que publica en `booking_events` y el aviso por Broadcast `slots:<barber_id>:<fecha>` sin datos personales.

### Semilla

- [x] `seed.sql` con "Corte normal, 60 min, precio [PENDIENTE]", un barbero administrador con porcentaje de 50 %, un horario de ejemplo marcado como tal y dos clientes de prueba.

### API de servidor de los paquetes

- [x] `@possos/catalog/server`: `listActiveServices()`.
- [x] `@possos/barbers/server`: `listActiveBarbers()`, horario y bloqueos.
- [x] `@possos/booking/server`: `getAvailableSlots()`, `book()`, `cancel()`, `reschedule()`, `confirmAppointment()`, `decidePending()`, `markAttendance()`, más `staffCreateAppointment()`, `resetNoShows()`, `listConflictingAppointments()`, `blockTime()` y `getAppointmentForNotification()`.
- [x] `@possos/commissions/server`: `recordCharge()`, `updateCharge()`, `voidCharge()`, `getSettlement()` y el porcentaje por barbero.
- [x] `@possos/booking/events`: contrato versionado de `appointment.created`, `appointment.rescheduled`, `appointment.cancelled` y `appointment.status_changed`.
- [x] Tipos generados y reexportados por cada módulo solo para sus tablas.

## Criterios de aceptación

- Las 10 pruebas obligatorias de [docs/09](../docs/09-modelo-datos.md#pruebas-obligatorias-pgtap) pasan.
- Ninguna tabla de `public` queda sin RLS (una prueba pgTAP lo revisa sobre `pg_tables`).
- Con el rol `anon`, `get_available_slots` responde y no devuelve ningún dato de clientes.
- Ninguna migración de un módulo crea ni altera tablas de otro.

## Pruebas

- pgTAP: las 10 obligatorias, más:
  - el reparto redondea al peso y barbero más barbería suman siempre el valor cobrado;
  - `get_settlement` excluye los cobros anulados;
  - un cliente no puede hacer `update` directo sobre `appointments`;
  - reprogramar a una hora ocupada no toca la cita original;
  - `get_available_slots` no ofrece horas antes de `min_lead_min` ni después de `max_days_ahead`;
  - un bloqueo nuevo encima de citas existentes devuelve la lista de esas citas;
  - la tabla de RLS por rol (cliente, barbero, admin) de [docs/06](../docs/06-roles-permisos.md#matriz-de-permisos).
- Vitest de la traducción de códigos de error a los textos de [docs/11](../docs/11-interfaz.md#textos-de-la-interfaz).

## Necesita del dueño

- El horario real de atención ([decisión 3](../docs/10-riesgos-decisiones-abiertas.md)). Mientras tanto, la semilla usa uno de ejemplo.
