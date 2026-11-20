-- Módulo booking: citas con adicionales (barba, cejas, diseño; docs/09).
--
-- Una cita guarda su servicio y, en appointment_addons, los adicionales que se eligieron. La
-- duración de la cita (period) y su precio (price_cop) ya incluyen los adicionales: se calculan
-- al reservar con private.booking_offer. Por eso la restricción no_double_booking (regla 3) sigue
-- igual y cubre el tiempo completo de la cita.
--
-- Las funciones que reciben un servicio reciben también p_addon_ids (por omisión, ninguno). Un
-- adicional que no es del servicio o está inactivo hace fallar la reserva con
-- SERVICE_NOT_AVAILABLE, igual que un servicio inactivo.

-- ---------------------------------------------------------------------------------------------
-- Tabla
-- ---------------------------------------------------------------------------------------------

create table public.appointment_addons (
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  addon_id       uuid not null references public.service_addons (id),
  primary key (appointment_id, addon_id)
);

create index appointment_addons_addon on public.appointment_addons (addon_id);

comment on table public.appointment_addons is
  'Módulo booking. Adicionales de una cita. Solo se escribe con las funciones de reserva.';

alter table public.appointment_addons enable row level security;

-- Quien ve la cita ve sus adicionales: la subconsulta pasa por la RLS de appointments.
create policy appointment_addons_select on public.appointment_addons
  for select to authenticated
  using (exists (select 1 from public.appointments a where a.id = appointment_id));

revoke all on public.appointment_addons from anon;
revoke insert, update, delete on public.appointment_addons from authenticated;

-- El personal ve también los adicionales inactivos, para no perder nombres en la agenda.
drop policy service_addons_select_active on public.service_addons;
create policy service_addons_select_active on public.service_addons
  for select to anon, authenticated
  using (active or (select public.is_admin()) or (select public.current_barber_id()) is not null);

-- ---------------------------------------------------------------------------------------------
-- Funciones internas
-- ---------------------------------------------------------------------------------------------

drop function private.booking_offer(uuid, uuid);

-- Duración y precio del servicio con este barbero, más los adicionales. Ninguna fila si no lo
-- ofrece, algo está inactivo o algún adicional no es de ese servicio. El precio es null si el del
-- servicio o el de algún adicional está [PENDIENTE].
create function private.booking_offer(
  p_barber_id  uuid,
  p_service_id uuid,
  p_addon_ids  uuid[] default '{}'
)
returns table (duration_min integer, price_cop integer)
language sql
stable
set search_path = ''
as $$
  with wanted as (
    select distinct x as id from unnest(coalesce(p_addon_ids, '{}'::uuid[])) x
  ),
  addons as (
    select a.duration_min, a.price_cop
    from wanted w
    join public.service_addons a on a.id = w.id
    where a.service_id = p_service_id and a.active
  )
  select coalesce(bs.duration_min_override, s.duration_min)
           + coalesce((select sum(x.duration_min) from addons x), 0)::integer,
         case when exists (select 1 from addons x where x.price_cop is null) then null
              else coalesce(bs.price_cop_override, s.price_cop)
                     + coalesce((select sum(x.price_cop) from addons x), 0)::integer
         end
  from public.barber_services bs
  join public.services s on s.id = bs.service_id
  join public.barbers b on b.id = bs.barber_id
  where bs.barber_id = p_barber_id
    and bs.service_id = p_service_id
    and s.active
    and b.active
    and (select count(*) from addons) = (select count(*) from wanted);
$$;

-- Los adicionales de una cita, para reprogramarla con los mismos.
create function private.booking_addon_ids(p_appointment_id uuid)
returns uuid[]
language sql
stable
set search_path = ''
as $$
  select coalesce(array_agg(aa.addon_id order by aa.addon_id), '{}'::uuid[])
  from public.appointment_addons aa
  where aa.appointment_id = p_appointment_id;
$$;

drop function private.booking_check(text, uuid, uuid, timestamptz, uuid);

-- Igual que antes (20261119120400_booking_core.sql), con la duración de los adicionales.
create function private.booking_check(
  p_mode       text,
  p_barber_id  uuid,
  p_service_id uuid,
  p_start_at   timestamptz,
  p_ignore_id  uuid default null,
  p_addon_ids  uuid[] default '{}'
)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_cfg public.booking_settings;
  v_duration integer;
  v_period tstzrange;
  v_day date;
begin
  select * into v_cfg from public.booking_settings where id;

  select o.duration_min into v_duration
  from private.booking_offer(p_barber_id, p_service_id, p_addon_ids) o;
  if v_duration is null then
    return 'SERVICE_NOT_AVAILABLE';
  end if;

  v_period := tstzrange(p_start_at, p_start_at + make_interval(mins => v_duration), '[)');
  v_day := (p_start_at at time zone v_cfg.timezone)::date;

  if p_mode = 'customer' then
    if p_start_at < now() + make_interval(mins => v_cfg.min_lead_min) then
      return 'TOO_SOON';
    end if;
    if v_day > (now() at time zone v_cfg.timezone)::date + v_cfg.max_days_ahead then
      return 'TOO_FAR';
    end if;
    if not exists (
      select 1 from private.booking_slot_starts(p_barber_id, v_day, v_duration) s
      where s = p_start_at
    ) then
      return 'OUTSIDE_WORKING_HOURS';
    end if;
  elsif not private.booking_within_hours(p_barber_id, v_period) then
    return 'OUTSIDE_WORKING_HOURS';
  end if;

  if exists (
    select 1 from public.time_off t
    where t.barber_id = p_barber_id and t.period && v_period
  ) then
    return 'IN_TIME_OFF';
  end if;

  if exists (
    select 1 from public.appointments a
    where a.barber_id = p_barber_id
      and a.period && v_period
      and a.status not in ('cancelled', 'rejected')
      and a.id is distinct from p_ignore_id
  ) then
    return 'SLOT_TAKEN';
  end if;

  return null;
end;
$$;

drop function private.booking_insert(
  uuid, uuid, uuid, timestamptz, public.appointment_status, text, boolean, integer, uuid
);

-- Inserta la cita con sus adicionales y enlaza al cliente con el barbero. La exclusión resuelve
-- las carreras.
create function private.booking_insert(
  p_barber_id        uuid,
  p_customer_id      uuid,
  p_service_id       uuid,
  p_start_at         timestamptz,
  p_status           public.appointment_status,
  p_source           text,
  p_auto_assigned    boolean,
  p_price_cop        integer,
  p_rescheduled_from uuid,
  p_addon_ids        uuid[] default '{}'
)
returns public.appointments
language plpgsql
set search_path = ''
as $$
declare
  v_duration integer;
  v_row public.appointments;
begin
  select o.duration_min into v_duration
  from private.booking_offer(p_barber_id, p_service_id, p_addon_ids) o;
  if v_duration is null then
    raise exception 'SERVICE_NOT_AVAILABLE';
  end if;

  insert into public.appointments
    (barber_id, customer_id, service_id, period, status, price_cop, source, auto_assigned,
     created_by, rescheduled_from)
  values
    (p_barber_id, p_customer_id, p_service_id,
     tstzrange(p_start_at, p_start_at + make_interval(mins => v_duration), '[)'),
     p_status, p_price_cop, p_source, p_auto_assigned, (select auth.uid()), p_rescheduled_from)
  returning * into v_row;

  insert into public.appointment_addons (appointment_id, addon_id)
  select distinct v_row.id, x from unnest(coalesce(p_addon_ids, '{}'::uuid[])) x;

  perform public.link_customer_to_barber(p_customer_id, p_barber_id);
  return v_row;
exception
  when exclusion_violation then
    raise exception 'SLOT_TAKEN';
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- API pública (RPC)
-- ---------------------------------------------------------------------------------------------

drop function public.get_available_days(uuid, uuid);
drop function public.get_available_slots(uuid, date, uuid);

-- Horas libres de un día para el servicio con sus adicionales. Solo horas de inicio y barberos
-- libres: nada de clientes.
create function public.get_available_slots(
  p_service_id uuid,
  p_day        date,
  p_barber_id  uuid default null,
  p_addon_ids  uuid[] default '{}'
)
returns table (start_at timestamptz, barber_ids uuid[])
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

  if p_day is null or p_day < v_today or p_day > v_today + v_cfg.max_days_ahead then
    return;
  end if;

  return query
    select c.slot_start, array_agg(c.barber_id order by c.barber_id)
    from (
      select b.id as barber_id, gs as slot_start,
             tstzrange(gs, gs + make_interval(mins => o.duration_min), '[)') as slot_period
      from public.barbers b
      cross join lateral private.booking_offer(b.id, p_service_id, p_addon_ids) o
      cross join lateral private.booking_slot_starts(b.id, p_day, o.duration_min) gs
      where b.active
        and (p_barber_id is null or b.id = p_barber_id)
    ) c
    where c.slot_start >= now() + make_interval(mins => v_cfg.min_lead_min)
      and not exists (
        select 1 from public.time_off t
        where t.barber_id = c.barber_id and t.period && c.slot_period
      )
      and not exists (
        select 1 from public.appointments a
        where a.barber_id = c.barber_id
          and a.status not in ('cancelled', 'rejected')
          and a.period && c.slot_period
      )
    group by c.slot_start
    order by c.slot_start;
end;
$$;

-- Cuántas horas libres tiene cada día de la ventana de reserva (tira de días).
create function public.get_available_days(
  p_service_id uuid,
  p_barber_id  uuid default null,
  p_addon_ids  uuid[] default '{}'
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
            from public.get_available_slots(p_service_id, d.d, p_barber_id, p_addon_ids))
    from (
      select (v_today + n) as d
      from generate_series(0, v_cfg.max_days_ahead) n
    ) d
    order by d.d;
end;
$$;

drop function public.book_appointment(uuid, timestamptz, uuid);

-- Reserva del cliente. Sin p_barber_id es "cualquiera disponible" (docs/04): el barbero libre
-- con menos citas ese día; si empatan, el que hace más tiempo no recibe una asignación así.
create function public.book_appointment(
  p_service_id uuid,
  p_start_at   timestamptz,
  p_barber_id  uuid default null,
  p_addon_ids  uuid[] default '{}'
)
returns public.appointments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_cfg public.booking_settings;
  v_customer_id uuid;
  v_barber_id uuid;
  v_code text;
  v_auto boolean := false;
  v_requires boolean;
  v_price integer;
  v_day date;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if p_service_id is null or p_start_at is null then
    raise exception 'INVALID_INPUT';
  end if;

  select c.id into v_customer_id from public.customers c where c.user_id = v_uid;
  if v_customer_id is null then
    raise exception 'NO_CUSTOMER_PROFILE';
  end if;

  if p_barber_id is not null then
    v_code := private.booking_check('customer', p_barber_id, p_service_id, p_start_at, null,
                                    p_addon_ids);
    if v_code is not null then
      raise exception '%', v_code;
    end if;
    v_barber_id := p_barber_id;
  else
    select * into v_cfg from public.booking_settings where id;
    v_day := (p_start_at at time zone v_cfg.timezone)::date;

    select b.id into v_barber_id
    from public.barbers b
    where b.active
      and private.booking_check('customer', b.id, p_service_id, p_start_at, null,
                                p_addon_ids) is null
    order by
      (select count(*) from public.appointments a
       where a.barber_id = b.id
         and a.status not in ('cancelled', 'rejected')
         and (lower(a.period) at time zone v_cfg.timezone)::date = v_day),
      (select max(a.created_at) from public.appointments a
       where a.barber_id = b.id and a.auto_assigned) asc nulls first,
      b.id
    limit 1;

    if v_barber_id is null then
      -- Nadie libre: se informa el motivo más útil (SLOT_TAKEN si alguno lo tenía ocupado).
      select x.code into v_code
      from (
        select private.booking_check('customer', bs.barber_id, p_service_id, p_start_at, null,
                                     p_addon_ids) as code
        from public.barber_services bs
        join public.barbers b on b.id = bs.barber_id
        where bs.service_id = p_service_id and b.active
      ) x
      where x.code is not null
      order by (x.code = 'SLOT_TAKEN') desc
      limit 1;
      raise exception '%', coalesce(v_code, 'SERVICE_NOT_AVAILABLE');
    end if;
    v_auto := true;
  end if;

  select s.requires_approval into v_requires
  from public.customer_booking_status s
  where s.customer_id = v_customer_id;

  select o.price_cop into v_price
  from private.booking_offer(v_barber_id, p_service_id, p_addon_ids) o;

  return private.booking_insert(
    v_barber_id, v_customer_id, p_service_id, p_start_at,
    case when coalesce(v_requires, false) then 'pending_approval'::public.appointment_status
         else 'booked'::public.appointment_status end,
    'customer', v_auto, v_price, null, p_addon_ids
  );
end;
$$;

drop function public.staff_create_appointment(uuid, uuid, uuid, timestamptz);

-- Cita creada por el personal, también para clientes sin cuenta. Sin reglas de anticipación.
create function public.staff_create_appointment(
  p_customer_id uuid,
  p_service_id  uuid,
  p_barber_id   uuid,
  p_start_at    timestamptz,
  p_addon_ids   uuid[] default '{}'
)
returns public.appointments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_price integer;
begin
  if (select auth.uid()) is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if p_customer_id is null or p_service_id is null or p_barber_id is null or p_start_at is null then
    raise exception 'INVALID_INPUT';
  end if;
  if not private.booking_is_staff_for(p_barber_id) then
    raise exception 'FORBIDDEN';
  end if;
  -- El barbero solo agenda a clientes que ya ve; el administrador, a cualquiera.
  if not exists (
    select 1 from public.customers c
    where c.id = p_customer_id
      and (public.is_admin() or exists (
        select 1 from public.barber_customers bc
        where bc.customer_id = c.id and bc.barber_id = p_barber_id
      ))
  ) then
    raise exception 'NOT_FOUND';
  end if;

  v_code := private.booking_check('staff', p_barber_id, p_service_id, p_start_at, null,
                                  p_addon_ids);
  if v_code is not null then
    raise exception '%', v_code;
  end if;

  select o.price_cop into v_price
  from private.booking_offer(p_barber_id, p_service_id, p_addon_ids) o;

  return private.booking_insert(
    p_barber_id, p_customer_id, p_service_id, p_start_at, 'booked', 'staff', false, v_price,
    null, p_addon_ids
  );
end;
$$;

-- Reprograma con los mismos adicionales. El resto, igual que en 20261119120400_booking_core.sql.
create or replace function public.reschedule_appointment(
  p_id            uuid,
  p_new_start_at  timestamptz,
  p_new_barber_id uuid default null
)
returns public.appointments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cfg public.booking_settings;
  v_old public.appointments;
  v_actor text;
  v_barber_id uuid;
  v_code text;
  v_requires boolean;
  v_status public.appointment_status;
  v_price integer;
  v_addons uuid[];
begin
  if (select auth.uid()) is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if p_new_start_at is null then
    raise exception 'INVALID_INPUT';
  end if;

  select * into v_old from public.appointments where id = p_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  v_actor := private.booking_actor(v_old.barber_id, v_old.customer_id);
  if v_actor is null then
    raise exception 'NOT_FOUND';
  end if;
  if v_old.status not in ('pending_approval', 'booked', 'confirmed') then
    raise exception 'INVALID_STATUS';
  end if;

  select * into v_cfg from public.booking_settings where id;
  if v_actor = 'customer'
     and lower(v_old.period) < now() + make_interval(mins => v_cfg.cancel_window_min) then
    raise exception 'TOO_LATE_TO_CANCEL';
  end if;

  v_barber_id := coalesce(p_new_barber_id, v_old.barber_id);
  if v_actor = 'staff' and not private.booking_is_staff_for(v_barber_id) then
    raise exception 'FORBIDDEN';
  end if;

  v_addons := private.booking_addon_ids(v_old.id);

  v_code := private.booking_check(v_actor, v_barber_id, v_old.service_id, p_new_start_at,
                                  v_old.id, v_addons);
  if v_code is not null then
    raise exception '%', v_code;
  end if;

  select s.requires_approval into v_requires
  from public.customer_booking_status s where s.customer_id = v_old.customer_id;
  v_status := case
    when v_old.status = 'pending_approval'
      or (v_actor = 'customer' and coalesce(v_requires, false)) then 'pending_approval'
    else 'booked'
  end;

  if v_barber_id = v_old.barber_id then
    v_price := v_old.price_cop;
  else
    select o.price_cop into v_price
    from private.booking_offer(v_barber_id, v_old.service_id, v_addons) o;
  end if;

  perform set_config('possos.rescheduling', v_old.id::text, true);
  update public.appointments
  set status = 'cancelled', cancelled_by = v_actor
  where id = v_old.id;
  perform set_config('possos.rescheduling', '', true);

  return private.booking_insert(
    v_barber_id, v_old.customer_id, v_old.service_id, p_new_start_at, v_status, v_actor,
    v_old.auto_assigned and v_barber_id = v_old.barber_id, v_price, v_old.id, v_addons
  );
end;
$$;

drop function public.list_my_appointments(uuid, integer);

-- Igual que en 20261119170000_booking_my_appointments.sql, con los nombres de los adicionales
-- (aunque estén inactivos), en su orden.
create function public.list_my_appointments(
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
  order by lower(a.period) desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
$$;

-- El nombre del servicio para los avisos lleva los adicionales: "Corte + Barba + Cejas".
create or replace function public.get_appointment_for_notification(p_id uuid)
returns table (
  appointment_id      uuid,
  status              public.appointment_status,
  start_at            timestamptz,
  end_at              timestamptz,
  service_name        text,
  barber_id           uuid,
  barber_name         text,
  barber_whatsapp_url text,
  customer_name       text,
  customer_phone      text,
  whatsapp_opt_in     boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.status, lower(a.period), upper(a.period),
         s.name || coalesce((
           select string_agg(' + ' || sa.name, '' order by sa.sort_order, sa.name)
           from public.appointment_addons aa
           join public.service_addons sa on sa.id = aa.addon_id
           where aa.appointment_id = a.id
         ), ''),
         b.id, b.display_name, b.whatsapp_url, c.full_name, c.phone, c.whatsapp_opt_in
  from public.appointments a
  join public.services s on s.id = a.service_id
  join public.barbers b on b.id = a.barber_id
  join public.customers c on c.id = a.customer_id
  where a.id = p_id;
$$;

-- Permisos: por omisión Supabase deja ejecutar todo a anon y authenticated.

revoke all on function public.get_available_slots(uuid, date, uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.get_available_days(uuid, uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.book_appointment(uuid, timestamptz, uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.staff_create_appointment(uuid, uuid, uuid, timestamptz, uuid[]) from public, anon, authenticated;
revoke all on function public.list_my_appointments(uuid, integer) from public, anon, authenticated;

grant execute on function public.get_available_slots(uuid, date, uuid, uuid[]) to anon, authenticated, service_role;
grant execute on function public.get_available_days(uuid, uuid, uuid[]) to anon, authenticated, service_role;
grant execute on function public.book_appointment(uuid, timestamptz, uuid, uuid[]) to authenticated;
grant execute on function public.staff_create_appointment(uuid, uuid, uuid, timestamptz, uuid[]) to authenticated;
grant execute on function public.list_my_appointments(uuid, integer) to authenticated;
