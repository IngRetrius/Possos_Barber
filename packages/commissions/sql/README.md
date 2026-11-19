# Tablas y funciones de `commissions`

Migración: `20261119120500_commissions_core.sql`.

Tablas: `commission_rates` y `charges`.

Funciones: `record_charge`, `update_charge`, `void_charge` y `get_settlement`. Leen la cita con `private.booking_appointment(id)` y nunca escriben en tablas de `booking`.

Un barbero necesita su fila en `commission_rates` para que se le registren cobros (`NO_COMMISSION_RATE`). El administrador la fija con `setCommissionRate()`.

Las migraciones de este módulo llevan el prefijo `_commissions_` en `supabase/migrations/` y solo crean o alteran estas tablas (regla 5 de [docs/08](../../../docs/08-estructura-monorepo.md#reglas-de-modularidad)). El detalle de columnas y políticas está en [docs/09](../../../docs/09-modelo-datos.md).
