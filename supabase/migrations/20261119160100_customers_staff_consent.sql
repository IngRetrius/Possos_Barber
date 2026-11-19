-- Módulo customers: el personal registra la autorización de datos que el cliente dio de palabra
-- (F6, "Nueva cita" con cliente nuevo; Ley 1581).
--
-- staff_create_customer ahora recibe la versión de la política que el cliente autorizó. Con
-- versión, la base pone data_consent_at; sin ella, el cliente queda sin autorización registrada
-- (como antes). El trigger customers_stamp_consent no toca a los clientes sin cuenta, así que la
-- hora la pone esta función.

drop function public.staff_create_customer(text, text, text, boolean);

create function public.staff_create_customer(
  p_full_name           text,
  p_phone               text default null,
  p_email               text default null,
  p_whatsapp_opt_in     boolean default false,
  p_data_policy_version text default null
)
returns public.customers
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_barber_id uuid := public.current_barber_id();
  v_version text := nullif(trim(p_data_policy_version), '');
  v_row public.customers;
begin
  if (select auth.uid()) is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if not public.is_admin() and v_barber_id is null then
    raise exception 'FORBIDDEN';
  end if;

  insert into public.customers
    (user_id, full_name, phone, email, whatsapp_opt_in, data_consent_at, data_policy_version,
     created_by)
  values
    (null, trim(p_full_name), nullif(trim(p_phone), ''), nullif(trim(p_email), ''),
     coalesce(p_whatsapp_opt_in, false), case when v_version is null then null else now() end,
     v_version, (select auth.uid()))
  returning * into v_row;

  if v_barber_id is not null then
    perform public.link_customer_to_barber(v_row.id, v_barber_id);
  end if;

  return v_row;
exception
  when check_violation or not_null_violation then
    raise exception 'INVALID_CUSTOMER';
end;
$$;

revoke all on function public.staff_create_customer(text, text, text, boolean, text)
  from public, anon, authenticated;
grant execute on function public.staff_create_customer(text, text, text, boolean, text)
  to authenticated;
