# Tablas y funciones de `notifications`

Tablas: `notification_settings`, `message_jobs`, `inbound_messages`, `push_subscriptions` y `event_cursors`.

Las migraciones de este módulo llevan el prefijo `_notifications_` en `supabase/migrations/` y solo crean o alteran estas tablas (regla 5 de [docs/08](../../../docs/08-estructura-monorepo.md#reglas-de-modularidad)). El detalle de columnas y políticas está en [docs/09](../../../docs/09-modelo-datos.md).
