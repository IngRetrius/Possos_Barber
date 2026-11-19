# Tablas y funciones de `booking`

Tablas: `booking_settings`, `appointments` (con la restricción de exclusión de la regla 3), `customer_booking_status` y `booking_events`.

Funciones: `get_available_slots`, `book_appointment`, `staff_create_appointment`, `cancel_appointment`, `reschedule_appointment`, `confirm_appointment`, `decide_pending`, `mark_attendance`, `reset_no_shows` y `get_appointment_for_notification`.

Las migraciones de este módulo llevan el prefijo `_booking_` en `supabase/migrations/` y solo crean o alteran estas tablas (regla 5 de [docs/08](../../../docs/08-estructura-monorepo.md#reglas-de-modularidad)). El detalle de columnas y políticas está en [docs/09](../../../docs/09-modelo-datos.md).
