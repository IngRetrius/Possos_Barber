# Tablas y funciones de `catalog`

Migración: `20261119120100_catalog_services.sql`.

Tablas: `services`. `price_cop` es null mientras el dueño no confirme el precio (**[PENDIENTE]**).

Las migraciones de este módulo llevan el prefijo `_catalog_` en `supabase/migrations/` y solo crean o alteran estas tablas (regla 5 de [docs/08](../../../docs/08-estructura-monorepo.md#reglas-de-modularidad)). El detalle de columnas y políticas está en [docs/09](../../../docs/09-modelo-datos.md).
