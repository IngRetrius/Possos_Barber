# Tablas y funciones de `auth`

Migración: `20261119120000_auth_staff_roles.sql`.

Tablas: `staff_roles` (rol `admin` o `barber` de cada usuario). Los usuarios viven en `auth.users`, que administra Supabase Auth.

Funciones: `is_admin()` y `has_role(role)`, `security definer`, para las políticas RLS de todos los módulos.

Esta migración también crea el esquema `private`, donde cada módulo pone sus funciones internas con su prefijo (`private.booking_*`, ...). PostgREST no lo expone.

Las migraciones de este módulo llevan el prefijo `_auth_` en `supabase/migrations/` y solo crean o alteran estas tablas (regla 5 de [docs/08](../../../docs/08-estructura-monorepo.md#reglas-de-modularidad)). El detalle de columnas y políticas está en [docs/09](../../../docs/09-modelo-datos.md).
