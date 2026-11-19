# Tablas y funciones de `auth`

Tablas: `staff_roles` (rol `admin` o `barber` de cada usuario). Los usuarios viven en `auth.users`, que administra Supabase Auth.

Las migraciones de este módulo llevan el prefijo `_auth_` en `supabase/migrations/` y solo crean o alteran estas tablas (regla 5 de [docs/08](../../../docs/08-estructura-monorepo.md#reglas-de-modularidad)). El detalle de columnas y políticas está en [docs/09](../../../docs/09-modelo-datos.md).
