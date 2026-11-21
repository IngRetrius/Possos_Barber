# Tablas y funciones de `commissions`

Migraciones: `20261119120500_commissions_core.sql` y `20261120150100_commissions_auto_charges.sql` (cobro automático, 20/11/2026).

Tablas: `commission_rates` y `charges`.

Funciones: `record_charge`, `update_charge`, `void_charge` y `get_settlement`. Leen la cita con `private.booking_appointment(id)` y nunca escriben en tablas de `booking`.

Cobro automático: el trigger `booking_events_commissions` (de este módulo, sobre `booking_events`, como el de `notifications`) escucha `appointment.status_changed`. Si la cita pasa a `completed`, la cobra con el precio de la reserva y la hora de fin como `charged_at` (`private.commissions_sync_appointment`); si pasa a `no_show`, anula su cobro con el motivo "No vino". No cobra sin precio, sin porcentaje ni citas que terminaron hace más de 3 días. Un error aquí solo deja un aviso: nunca hace fallar a `booking`.

Un barbero necesita su fila en `commission_rates` para que se le registren cobros (`NO_COMMISSION_RATE`). El administrador la fija con `setCommissionRate()`.

Las migraciones de este módulo llevan el prefijo `_commissions_` en `supabase/migrations/` y solo crean o alteran estas tablas (regla 5 de [docs/08](../../../docs/08-estructura-monorepo.md#reglas-de-modularidad)). El detalle de columnas y políticas está en [docs/09](../../../docs/09-modelo-datos.md).
