# Tablas y funciones de `booking`

Migraciones: `20261119120400_booking_core.sql`, `20261119140100_booking_available_days.sql` (F4) y `20261119160000_booking_realtime.sql` (F6: `appointments` en la publicación `supabase_realtime`, para la agenda en vivo del panel).

Tablas: `booking_settings`, `appointments` (con la restricción de exclusión de la regla 3), `customer_booking_status` y `booking_events`.

Funciones públicas (RPC): `get_available_slots`, `get_available_days` (horas libres por día de la ventana, para la tira de días; sin sesión), `my_booking_requires_approval` (si la reserva del cliente de la sesión quedará pendiente; no expone el contador de inasistencias), `book_appointment`, `staff_create_appointment`, `cancel_appointment`, `reschedule_appointment`, `confirm_appointment`, `decide_pending`, `mark_attendance`, `reset_no_shows`, `list_conflicting_appointments` y `get_appointment_for_notification` (solo `service_role`).

Funciones internas en `private`: `booking_offer`, `booking_slot_starts`, `booking_within_hours`, `booking_check`, `booking_insert`, `booking_is_staff_for` y `booking_actor`. Para otros módulos de SQL, `private.booking_appointment(id)` es la API de lectura de una cita, sin datos del cliente; la usa `commissions`.

Triggers sobre `appointments`: el candado del barbero y el rechazo dentro de `time_off`, la publicación en `booking_events` y el aviso por Broadcast en `slots:<barber_id>:<fecha>`.

Las migraciones de este módulo llevan el prefijo `_booking_` en `supabase/migrations/` y solo crean o alteran estas tablas (regla 5 de [docs/08](../../../docs/08-estructura-monorepo.md#reglas-de-modularidad)). El detalle de columnas y políticas está en [docs/09](../../../docs/09-modelo-datos.md).
