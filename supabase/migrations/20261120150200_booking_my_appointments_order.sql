-- Desempate en list_my_appointments (20/11/2026). Ordenaba solo por la hora de inicio: con más
-- de p_limit citas a la misma hora (canceladas y vuelta a reservar, como hacen las pruebas e2e),
-- el orden entre ellas quedaba al azar y la cita vigente podía quedar fuera de la lista. Ahora,
-- a la misma hora, va primero la más reciente. Lo demás es igual que en
-- 20261120120100_booking_addons.sql.

create or replace function public.list_my_appointments(
  p_id    uuid default null,
  p_limit integer default 50
)
returns table (
  id                  uuid,
  status              public.appointment_status,
  start_at            timestamptz,
  end_at              timestamptz,
  service_id          uuid,
  service_name        text,
  service_active      boolean,
  addon_ids           uuid[],
  addon_names         text[],
  barber_id           uuid,
  barber_name         text,
  barber_active       boolean,
  barber_whatsapp_url text,
  price_cop           integer,
  change_deadline     timestamptz,
  replaced_by         uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id,
         a.status,
         lower(a.period),
         upper(a.period),
         a.service_id,
         s.name,
         s.active,
         coalesce(ad.ids, '{}'::uuid[]),
         coalesce(ad.names, '{}'::text[]),
         a.barber_id,
         b.display_name,
         b.active,
         b.whatsapp_url,
         a.price_cop,
         lower(a.period) - make_interval(mins => cfg.cancel_window_min),
         r.id
  from public.appointments a
  join public.customers c on c.id = a.customer_id
  join public.services s on s.id = a.service_id
  join public.barbers b on b.id = a.barber_id
  cross join public.booking_settings cfg
  left join lateral (
    select array_agg(sa.id order by sa.sort_order, sa.name) as ids,
           array_agg(sa.name order by sa.sort_order, sa.name) as names
    from public.appointment_addons aa
    join public.service_addons sa on sa.id = aa.addon_id
    where aa.appointment_id = a.id
  ) ad on true
  left join lateral (
    select n.id
    from public.appointments n
    where n.rescheduled_from = a.id
    order by n.created_at desc
    limit 1
  ) r on true
  where c.user_id = (select auth.uid())
    and cfg.id
    and (p_id is null or a.id = p_id)
    and (p_id is not null or r.id is null)
  order by lower(a.period) desc, a.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
$$;
