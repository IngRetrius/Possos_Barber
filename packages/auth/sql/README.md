# Tablas y funciones de `auth`

Migraciones: `20261119120000_auth_staff_roles.sql`, `20261119130000_auth_delete_account.sql` (F3) y `20261119160300_auth_role_admin.sql` (F6).

Tablas: `staff_roles` (rol `admin` o `barber` de cada usuario). Los usuarios viven en `auth.users`, que administra Supabase Auth.

Funciones: `is_admin()` y `has_role(role)`, `security definer`, para las políticas RLS de todos los módulos. `delete_my_account()` (F3): el cliente borra su usuario de `auth.users`; el personal recibe `FORBIDDEN`. Lo que cuelga del usuario se resuelve con las claves foráneas, y `customers` anonimiza el perfil con su propio trigger.

Roles desde el panel (F6), solo para el administrador: `list_staff()` (correo y roles de cada cuenta del personal), `grant_role(email, role)` (por correo; `USER_NOT_FOUND` si no hay cuenta) y `revoke_role(user_id, role)` (`CANNOT_REVOKE_SELF` si se quita a sí mismo el de administrador; así siempre queda uno). Enlazar la cuenta con su perfil de `barbers` lo compone la app.

El primer administrador no se crea con una migración (su correo no va en el repo) sino con `supabase/scripts/primer-administrador.sql`.

Esta migración también crea el esquema `private`, donde cada módulo pone sus funciones internas con su prefijo (`private.booking_*`, ...). PostgREST no lo expone.

Las migraciones de este módulo llevan el prefijo `_auth_` en `supabase/migrations/` y solo crean o alteran estas tablas (regla 5 de [docs/08](../../../docs/08-estructura-monorepo.md#reglas-de-modularidad)). El detalle de columnas y políticas está en [docs/09](../../../docs/09-modelo-datos.md).
