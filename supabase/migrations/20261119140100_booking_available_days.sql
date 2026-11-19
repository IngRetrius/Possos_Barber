-- Módulo booking: lo que necesita el flujo de reserva del cliente (F4).
--
-- 1. get_available_days: cuántas horas libres tiene cada día de la ventana de reserva, para la
--    tira de días. Una sola llamada en vez de una por día. No devuelve datos de clientes.
-- 2. my_booking_requires_approval: si la próxima reserva del cliente quedará pendiente de
--    aprobación, para avisarle antes de reservar. Solo eso: el cliente no ve su contador de
--    inasistencias (docs/06), así que customer_booking_status sigue cerrada para él.

create function public.get_available_days(
  p_service_id uuid,
  p_barber_id  uuid default null
)
returns table (day date, slots integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_cfg public.booking_settings;
  v_today date;
begin
  select * into v_cfg from public.booking_settings where id;
  v_today := (now() at time zone v_cfg.timezone)::date;

  return query
    select d.d,
           (select count(*)::integer
            from public.get_available_slots(p_service_id, d.d, p_barber_id))
    from (
      select (v_today + n) as d
      from generate_series(0, v_cfg.max_days_ahead) n
    ) d
    order by d.d;
end;
$$;

revoke all on function public.get_available_days(uuid, uuid) from public, anon, authenticated;
grant execute on function public.get_available_days(uuid, uuid) to anon, authenticated, service_role;

create function public.my_booking_requires_approval()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select s.requires_approval
    from public.customer_booking_status s
    join public.customers c on c.id = s.customer_id
    where c.user_id = (select auth.uid())
  ), false);
$$;

revoke all on function public.my_booking_requires_approval() from public, anon, authenticated;
grant execute on function public.my_booking_requires_approval() to authenticated;
