-- Módulo auth: borrar la cuenta propia (F3, Ley 1581 y riesgo 8 de docs/10).
--
-- Borra el usuario de Supabase Auth. Lo que cuelga de auth.users se resuelve con sus claves
-- foráneas: staff_roles y push_subscriptions se borran (cascade) y las demás quedan en null.
-- El módulo customers anonimiza el perfil cuando su user_id pasa a null (su propia migración).
--
-- El personal no se borra desde aquí: quitar a un barbero o al administrador deja la agenda y
-- los cobros sin dueño. Eso se hace desde el panel del administrador (F6) o a mano.

create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if exists (select 1 from public.staff_roles where user_id = v_user_id) then
    raise exception 'FORBIDDEN';
  end if;

  delete from auth.users where id = v_user_id;
end;
$$;

comment on function public.delete_my_account() is
  'Módulo auth. El cliente borra su cuenta; el personal recibe FORBIDDEN.';

revoke all on function public.delete_my_account() from public, anon, authenticated;
grant execute on function public.delete_my_account() to authenticated;
