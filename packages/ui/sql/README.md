# Tablas y funciones de `ui`

Ninguna. `ui` es la base visual y no toca la base de datos.

Las migraciones de este módulo llevan el prefijo `_ui_` en `supabase/migrations/` y solo crean o alteran estas tablas (regla 5 de [docs/08](../../../docs/08-estructura-monorepo.md#reglas-de-modularidad)). El detalle de columnas y políticas está en [docs/09](../../../docs/09-modelo-datos.md).
