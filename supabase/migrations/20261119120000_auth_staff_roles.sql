-- Módulo auth: roles del personal (docs/06 y docs/09).
--
-- Un cliente no necesita fila de rol. El barbero tiene `barber` aquí y su fila en `barbers`;
-- el administrador tiene `admin`. Nadie se asigna un rol a sí mismo: solo el administrador
-- escribe en esta tabla, y el primer administrador se crea con un script o una migración (F3).

-- Esquema para funciones internas de todos los módulos. No está en los esquemas que expone
-- PostgREST (supabase/config.toml), así que nada de aquí se puede llamar como RPC.
-- Cada módulo nombra sus funciones con su prefijo: private.booking_*, private.customers_*...
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.staff_role as enum ('admin', 'barber');

create table public.staff_roles (
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       public.staff_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

comment on table public.staff_roles is 'Módulo auth. Roles del personal; los clientes no tienen fila.';

-- Funciones de rol. security definer para que las políticas RLS las usen sin que el usuario
-- pueda leer staff_roles de otros. search_path vacío: todo va con su esquema.

create function public.has_role(p_role public.staff_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff_roles
    where user_id = (select auth.uid()) and role = p_role
  );
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role('admin');
$$;

revoke all on function public.has_role(public.staff_role) from public, anon, authenticated;
revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.has_role(public.staff_role) to anon, authenticated, service_role;
grant execute on function public.is_admin() to anon, authenticated, service_role;

alter table public.staff_roles enable row level security;

create policy staff_roles_select on public.staff_roles
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy staff_roles_admin_insert on public.staff_roles
  for insert to authenticated
  with check ((select public.is_admin()));

create policy staff_roles_admin_delete on public.staff_roles
  for delete to authenticated
  using ((select public.is_admin()));

revoke all on public.staff_roles from anon;
revoke update on public.staff_roles from authenticated;
