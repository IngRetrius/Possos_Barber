-- Módulo auth: el administrador asigna y quita roles desde el panel (F6, docs/06).
--
-- staff_roles solo guarda user_id, y el administrador no puede leer auth.users: para dar un rol
-- por correo, y para ver a quién se le dio, hacen falta estas funciones. Solo el administrador
-- las usa. Enlazar la cuenta con su fila de barbers es del módulo barbers (la app lo compone).
--
-- Protección: nadie se quita a sí mismo el rol de administrador. Como solo un administrador
-- puede quitar roles, eso basta para que siempre quede al menos uno.

create function public.list_staff()
returns table (user_id uuid, email text, roles public.staff_role[])
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  return query
    select u.id, u.email::text, array_agg(r.role order by r.role)
    from public.staff_roles r
    join auth.users u on u.id = r.user_id
    group by u.id, u.email
    order by u.email;
end;
$$;

create function public.grant_role(p_email text, p_role public.staff_role)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  if p_role is null or nullif(trim(p_email), '') is null then
    raise exception 'INVALID_INPUT';
  end if;

  select u.id into v_user_id
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
  limit 1;
  if v_user_id is null then
    raise exception 'USER_NOT_FOUND';
  end if;

  insert into public.staff_roles (user_id, role)
  values (v_user_id, p_role)
  on conflict do nothing;

  return v_user_id;
end;
$$;

create function public.revoke_role(p_user_id uuid, p_role public.staff_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  if p_user_id is null or p_role is null then
    raise exception 'INVALID_INPUT';
  end if;
  if p_role = 'admin' and p_user_id = (select auth.uid()) then
    raise exception 'CANNOT_REVOKE_SELF';
  end if;

  delete from public.staff_roles where user_id = p_user_id and role = p_role;
end;
$$;

revoke all on function public.list_staff() from public, anon, authenticated;
revoke all on function public.grant_role(text, public.staff_role) from public, anon, authenticated;
revoke all on function public.revoke_role(uuid, public.staff_role) from public, anon, authenticated;
grant execute on function public.list_staff() to authenticated;
grant execute on function public.grant_role(text, public.staff_role) to authenticated;
grant execute on function public.revoke_role(uuid, public.staff_role) to authenticated;
