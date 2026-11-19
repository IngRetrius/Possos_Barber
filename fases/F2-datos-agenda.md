# F2. Datos y reglas de la agenda

## Objetivo

Que la base de datos tenga todas las tablas del MVP, la restricción que impide dos citas a la vez, RLS en todo y las funciones que usan la interfaz y los recordatorios. Al terminar, las reglas críticas se cumplen aunque la interfaz falle.

**Depende de:** F0. **Toca:** `supabase/migrations`, `supabase/tests`, `supabase/seed.sql` y la API de servidor de `catalog`, `barbers`, `customers`, `booking` y `commissions`.

La especificación está en [docs/09-modelo-datos.md](../docs/09-modelo-datos.md) y las reglas en [docs/04-agendamiento.md](../docs/04-agendamiento.md).

## Tareas

### Migraciones (una por módulo, con su prefijo)

- [ ] `auth`: `staff_roles`, `is_admin()`, `has_role()` y `current_barber_id()`.
- [ ] `catalog`: `services`.
- [ ] `barbers`: `barbers`, `barber_services`, `working_hours`, `time_off` (con su exclusión) y `portfolio_items`.
- [ ] `customers`: `customers`, `barber_customers` y `customer_notes`.
- [ ] `booking`: `booking_settings`, `appointments` con `no_double_booking`, `customer_booking_status`, `booking_events` y el trigger de `time_off` con el candado sobre `barbers`.
- [ ] `commissions`: `commission_rates` y `charges`, con las columnas generadas del reparto ([docs/09](../docs/09-modelo-datos.md#commissions)).
- [ ] `notifications`: `notification_settings`, `message_jobs`, `inbound_messages`, `push_subscriptions` y `event_cursors` (las tablas; la lógica es de F7).
- [ ] RLS activado en todas las tablas de `public`, con las políticas de [docs/09](../docs/09-modelo-datos.md#políticas-rls-principales).
- [ ] Storage: `barber-photos` y `portfolio` con políticas por prefijo `<barber_id>/`.

### Funciones

- [ ] `get_available_slots(service_id, barber_id?, date)`: horario del día, menos bloqueos, menos citas que ocupan, menos la anticipación mínima, alineado al intervalo y con espacio para la duración. Solo devuelve horas de inicio y barberos libres.
- [ ] `book_appointment`, `staff_create_appointment`, `cancel_appointment`, `reschedule_appointment`, `confirm_appointment`, `decide_pending`, `mark_attendance`, `reset_no_shows` y `get_appointment_for_notification`.
- [ ] `record_charge`, `update_charge`, `void_charge` y `get_settlement` del módulo `commissions`.
- [ ] Errores con códigos estables que la interfaz traduce: `SLOT_TAKEN`, `TOO_LATE_TO_CANCEL`, `OUTSIDE_WORKING_HOURS`, `IN_TIME_OFF`, `TOO_SOON`, `TOO_FAR`.
- [ ] Trigger que publica en `booking_events` y el aviso por Broadcast `slots:<barber_id>:<fecha>` sin datos personales.

### Semilla

- [ ] `seed.sql` con "Corte normal, 60 min, precio [PENDIENTE]", un barbero administrador con porcentaje de 50 %, un horario de ejemplo marcado como tal y dos clientes de prueba.

### API de servidor de los paquetes

- [ ] `@possos/catalog/server`: `listActiveServices()`.
- [ ] `@possos/barbers/server`: `listActiveBarbers()`, horario y bloqueos.
- [ ] `@possos/booking/server`: `getAvailableSlots()`, `book()`, `cancel()`, `reschedule()`, `confirmAppointment()`, `decidePending()`, `markAttendance()`.
- [ ] `@possos/commissions/server`: `recordCharge()`, `updateCharge()`, `voidCharge()`, `getSettlement()` y el porcentaje por barbero.
- [ ] `@possos/booking/events`: contrato versionado de `appointment.created`, `appointment.rescheduled`, `appointment.cancelled` y `appointment.status_changed`.
- [ ] Tipos generados y reexportados por cada módulo solo para sus tablas.

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
