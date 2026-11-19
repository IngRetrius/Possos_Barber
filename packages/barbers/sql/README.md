# Tablas y funciones de `barbers`

Migración: `20261119120200_barbers_core.sql`.

Tablas: `barbers`, `barber_services`, `working_hours`, `time_off` (con exclusión entre bloqueos del mismo barbero) y `portfolio_items`.

Funciones:

- `current_barber_id()`: el `barbers.id` del usuario actual si tiene el rol `barber`; si no, null. La usan las políticas RLS de todos los módulos.
- `create_time_off(barber_id, starts_at, ends_at, reason)`: crea un bloqueo con el candado del barbero (`select ... for update` sobre `barbers`), el mismo que toma el trigger de `appointments`. Para saber qué citas quedaron debajo, `blockTime()` de `@possos/booking/server` llama después a `list_conflicting_appointments`.

Storage: buckets públicos `barber-photos` y `portfolio`. Escriben el administrador o el barbero dueño de la carpeta `<barber_id>/`.

Un trigger impide que un barbero sin rol de administrador cambie su `user_id`, `active` o `slot_interval_min`.

Las migraciones de este módulo llevan el prefijo `_barbers_` en `supabase/migrations/` y solo crean o alteran estas tablas (regla 5 de [docs/08](../../../docs/08-estructura-monorepo.md#reglas-de-modularidad)). El detalle de columnas y políticas está en [docs/09](../../../docs/09-modelo-datos.md).
