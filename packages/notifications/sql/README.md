# Tablas y funciones de `notifications`

Migración: `20261119120600_notifications_core.sql`.

Tablas: `notification_settings`, `message_jobs`, `inbound_messages`, `push_subscriptions` y `event_cursors`. La lógica de despacho y el webhook son de F7.

Las migraciones de este módulo llevan el prefijo `_notifications_` en `supabase/migrations/` y solo crean o alteran estas tablas (regla 5 de [docs/08](../../../docs/08-estructura-monorepo.md#reglas-de-modularidad)). El detalle de columnas y políticas está en [docs/09](../../../docs/09-modelo-datos.md).
