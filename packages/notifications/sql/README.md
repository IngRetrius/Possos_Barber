# Tablas y funciones de `notifications`

Migraciones: `20261119120600_notifications_core.sql` (tablas, F2), `20261119180000_notifications_dispatch.sql` (despacho de `booking_events` y push, F8) y `20261120130000_notifications_whatsapp.sql` (WhatsApp, F7).

Tablas: `notification_settings`, `message_jobs`, `inbound_messages`, `push_subscriptions` y `event_cursors`. La lógica del despacho, del envío por WhatsApp y del webhook está en `src/`; ver [F8-entrega](../../../fases/F8-entrega.md) y [F7-entrega](../../../fases/F7-entrega.md).

Las migraciones de este módulo llevan el prefijo `_notifications_` en `supabase/migrations/` y solo crean o alteran estas tablas (regla 5 de [docs/08](../../../docs/08-estructura-monorepo.md#reglas-de-modularidad)). El detalle de columnas y políticas está en [docs/09](../../../docs/09-modelo-datos.md).
