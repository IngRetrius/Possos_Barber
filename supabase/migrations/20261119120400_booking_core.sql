-- Módulo booking: agenda, citas, inasistencias y eventos (docs/04 y docs/09).
--
-- La garantía central es la restricción no_double_booking (regla 3 de CLAUDE.md): un barbero no
-- puede tener dos citas que se crucen. Ningún cambio puede quitarla ni debilitarla; la prueban
-- los archivos de supabase/tests/database/.
--
-- Nadie escribe directamente en appointments: todo pasa por las funciones de abajo, que validan
-- rol y política. Los errores salen con un código estable en el mensaje (SLOT_TAKEN, ...), que
-- @possos/booking traduce a los textos de docs/11.

-- ---------------------------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------------------------

create table public.booking_settings (
  id                boolean primary key default true check (id),
  min_lead_min      integer not null default 60 check (min_lead_min >= 0),
  max_days_ahead    integer not null default 30 check (max_days_ahead > 0),
  cancel_window_min integer not null default 120 check (cancel_window_min >= 0),
  no_show_threshold integer not null default 2 check (no_show_threshold > 0),
  timezone          text not null default 'America/Bogota',
  updated_at        timestamptz not null default now()
);

-- Valores del dueño (18/11/2026, docs/04). Una sola fila.
insert into public.booking_settings default values;

create type public.appointment_status as enum
  ('pending_approval', 'booked', 'confirmed', 'completed', 'no_show', 'cancelled', 'rejected');

create table public.appointments (
  id               uuid primary key default gen_random_uuid(),
  barber_id        uuid not null references public.barbers (id),
  customer_id      uuid not null references public.customers (id),
  service_id       uuid not null references public.services (id),
  period           tstzrange not null,
  status           public.appointment_status not null default 'booked',
  -- Precio al momento de reservar. Null si el servicio aún no tiene precio ([PENDIENTE]).
  price_cop        integer check (price_cop >= 0),
  source           text not null check (source in ('customer', 'staff')),
  auto_assigned    boolean not null default false, -- "cualquiera disponible"
  created_by       uuid references auth.users (id) on delete set null,
  confirmed_at     timestamptz,
  confirmed_via    text check (confirmed_via in ('customer', 'staff', 'whatsapp')),
  cancelled_by     text check (cancelled_by in ('customer', 'staff')),
  cancel_reason    text,
  rescheduled_from uuid references public.appointments (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint period_is_half_open
    check (not isempty(period) and lower_inc(period) and not upper_inc(period)
           and not lower_inf(period) and not upper_inf(period)),

  -- La garantía central: un barbero no puede tener dos citas que se crucen.
  constraint no_double_booking
    exclude using gist (barber_id with =, period with &&)
    where (status not in ('cancelled', 'rejected'))
);

create index appointments_customer on public.appointments (customer_id);
create index appointments_period on public.appointments using gist (period);
create index appointments_rescheduled_from on public.appointments (rescheduled_from);

create table public.customer_booking_status (
  customer_id       uuid primary key references public.customers (id) on delete cascade,
  no_show_count     integer not null default 0 check (no_show_count >= 0),
  requires_approval boolean not null default false,
  updated_at        timestamptz not null default now()
);

-- Contrato versionado en packages/booking/src/events.ts. Sin datos personales: solo ids y fechas.
create table public.booking_events (
  id             bigint generated always as identity primary key,
  type           text not null check (type in ('appointment.created', 'appointment.rescheduled',
                                               'appointment.cancelled', 'appointment.status_changed')),
  version        smallint not null,
  appointment_id uuid references public.appointments (id) on delete set null,
  payload        jsonb not null,
  created_at     timestamptz not null default now()
);

comment on table public.appointments is 'Módulo booking. Solo se escribe con funciones; ver no_double_booking.';
comment on table public.booking_events is 'Módulo booking. Lo leen otros módulos (notifications) con su cursor.';

-- ---------------------------------------------------------------------------------------------
-- Funciones internas (esquema private: no se exponen por la API)
-- ---------------------------------------------------------------------------------------------

-- Duración y precio del servicio con este barbero; ninguna fila si no lo ofrece o algo está inactivo.
create function private.booking_offer(p_barber_id uuid, p_service_id uuid)
returns table (duration_min integer, price_cop integer)
language sql
stable
set search_path = ''
as $$
  select coalesce(bs.duration_min_override, s.duration_min),
         coalesce(bs.price_cop_override, s.price_cop)
  from public.barber_services bs
  join public.services s on s.id = bs.service_id
  join public.barbers b on b.id = bs.barber_id
  where bs.barber_id = p_barber_id
    and bs.service_id = p_service_id
    and s.active
    and b.active;
$$;

-- Horas de inicio posibles de un día según el horario semanal, alineadas al intervalo del barbero
-- desde el inicio de cada rango y con espacio para la duración. No descuenta bloqueos ni citas.
create function private.booking_slot_starts(p_barber_id uuid, p_day date, p_duration_min integer)
returns setof timestamptz
language sql
stable
set search_path = ''
as $$
  with cfg as (
    select timezone as tz from public.booking_settings where id
  ),
  win as (
    select (p_day + wh.start_time) at time zone cfg.tz as w_start,
           (p_day + wh.end_time) at time zone cfg.tz as w_end,
           b.slot_interval_min
    from public.working_hours wh
    join public.barbers b on b.id = wh.barber_id
    cross join cfg
    where wh.barber_id = p_barber_id
      and wh.weekday = extract(isodow from p_day)
  )
  select gs
  from win
  cross join lateral generate_series(
    win.w_start,
    win.w_end - make_interval(mins => p_duration_min),
    make_interval(mins => win.slot_interval_min)
  ) gs;
$$;

-- ¿El periodo cabe completo en un rango del horario semanal? (para citas del personal)
create function private.booking_within_hours(p_barber_id uuid, p_period tstzrange)
returns boolean
language sql
stable
set search_path = ''
as $$
  with cfg as (
    select timezone as tz from public.booking_settings where id
  ),
  day as (
    select (lower(p_period) at time zone cfg.tz)::date as d, cfg.tz from cfg
  )
  select exists (
    select 1
    from public.working_hours wh, day
    where wh.barber_id = p_barber_id
      and wh.weekday = extract(isodow from day.d)
      and tstzrange((day.d + wh.start_time) at time zone day.tz,
                    (day.d + wh.end_time) at time zone day.tz, '[)') @> p_period
  );
$$;

-- Valida una hora para un barbero. Devuelve el código de error o null si se puede reservar.
-- p_mode 'customer' aplica anticipación, máximo de días y alineación al intervalo;
-- 'staff' solo exige que la cita quepa en el horario (docs/04: sin reglas de anticipación).
create function private.booking_check(
  p_mode       text,
  p_barber_id  uuid,
  p_service_id uuid,
  p_start_at   timestamptz,
  p_ignore_id  uuid default null
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

  select o.duration_min into v_duration from private.booking_offer(p_barber_id, p_service_id) o;
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

-- Inserta la cita y enlaza al cliente con el barbero. La exclusión resuelve las carreras.
create function private.booking_insert(
  p_barber_id        uuid,
  p_customer_id      uuid,
  p_service_id       uuid,
  p_start_at         timestamptz,
  p_status           public.appointment_status,
  p_source           text,
  p_auto_assigned    boolean,
  p_price_cop        integer,
  p_rescheduled_from uuid
)
returns public.appointments
language plpgsql
set search_path = ''
as $$
declare
  v_duration integer;
  v_row public.appointments;
begin
  select o.duration_min into v_duration from private.booking_offer(p_barber_id, p_service_id) o;
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

  perform public.link_customer_to_barber(p_customer_id, p_barber_id);
  return v_row;
exception
  when exclusion_violation then
    raise exception 'SLOT_TAKEN';
end;
$$;

-- ¿El usuario actual es personal de esa agenda? (administrador o el barbero de la cita)
-- coalesce: para quien no es barbero, current_barber_id() es null y la comparación también;
-- sin él, un `if not ...` con null no lanzaría el error.
create function private.booking_is_staff_for(p_barber_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(public.is_admin() or p_barber_id = public.current_barber_id(), false);
$$;

-- Quién actúa sobre una cita: 'staff', 'customer' (su dueño) o null (no la ve).
create function private.booking_actor(p_barber_id uuid, p_customer_id uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when private.booking_is_staff_for(p_barber_id) then 'staff'
    when exists (
      select 1 from public.customers c
      where c.id = p_customer_id and c.user_id = (select auth.uid())
    ) then 'customer'
  end;
$$;

-- API de lectura para otros módulos de SQL (commissions): la cita sin datos del cliente.
create function private.booking_appointment(p_id uuid)
returns table (
  id          uuid,
  barber_id   uuid,
  service_id  uuid,
  customer_id uuid,
  status      public.appointment_status,
  price_cop   integer,
  start_at    timestamptz,
  end_at      timestamptz
)
language sql
stable
set search_path = ''
as $$
  select a.id, a.barber_id, a.service_id, a.customer_id, a.status, a.price_cop,
         lower(a.period), upper(a.period)
  from public.appointments a
  where a.id = p_id;
$$;

-- ---------------------------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------------------------

create function private.booking_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger appointments_touch_updated_at
  before update on public.appointments
  for each row execute function private.booking_touch_updated_at();

-- Bloqueos (time_off) y citas no pueden ir en la misma restricción. Este trigger toma el candado
-- del barbero (el mismo que toma create_time_off) y rechaza la cita si cae en un bloqueo.
create function private.booking_guard_time_off()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('cancelled', 'rejected') then
    return new;
  end if;

  perform 1 from public.barbers where id = new.barber_id for update;

  if exists (
    select 1 from public.time_off t
    where t.barber_id = new.barber_id and t.period && new.period
  ) then
    raise exception 'IN_TIME_OFF';
  end if;

  return new;
end;
$$;

create trigger appointments_guard_time_off
  before insert or update of period, barber_id on public.appointments
  for each row execute function private.booking_guard_time_off();

-- Publica en booking_events. Al reprogramar, la cita vieja se cancela sin evento propio:
-- reschedule_appointment marca la transacción con possos.rescheduling y el evento
-- appointment.rescheduled de la nueva lleva rescheduled_from.
create function private.booking_publish_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type text;
begin
  if tg_op = 'INSERT' then
    v_type := case when new.rescheduled_from is null
                   then 'appointment.created' else 'appointment.rescheduled' end;
  elsif new.status is distinct from old.status then
    if new.status = 'cancelled' then
      if coalesce(current_setting('possos.rescheduling', true), '') = new.id::text then
        return null;
      end if;
      v_type := 'appointment.cancelled';
    else
      v_type := 'appointment.status_changed';
    end if;
  else
    return null;
  end if;

  insert into public.booking_events (type, version, appointment_id, payload)
  values (v_type, 1, new.id, jsonb_build_object(
    'appointment_id', new.id,
    'barber_id', new.barber_id,
    'customer_id', new.customer_id,
    'service_id', new.service_id,
    'start_at', lower(new.period),
    'end_at', upper(new.period),
    'status', new.status,
    'previous_status', case when tg_op = 'UPDATE' then old.status end,
    'source', new.source,
    'cancelled_by', new.cancelled_by,
    'rescheduled_from', new.rescheduled_from
  ));

  return null;
end;
$$;

create trigger appointments_publish_event
  after insert or update on public.appointments
  for each row execute function private.booking_publish_event();

-- Aviso por Broadcast "cambió la disponibilidad" en slots:<barber_id>:<fecha>, sin datos
-- personales. Si falla (por ejemplo, nadie se ha conectado hoy y no existe la partición de
-- realtime.messages, docs/07), la reserva sigue: el aviso no es crítico.
create function private.booking_broadcast_slots()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day text;
begin
  if tg_op = 'UPDATE'
     and new.status is not distinct from old.status
     and new.period = old.period then
    return null;
  end if;

  select to_char(lower(new.period) at time zone s.timezone, 'YYYY-MM-DD')
  into v_day
  from public.booking_settings s
  where s.id;

  begin
    perform realtime.send(
      jsonb_build_object('barber_id', new.barber_id, 'date', v_day),
      'slots_changed',
      'slots:' || new.barber_id::text || ':' || v_day,
      false
    );
  exception
    when others then
      null;
  end;

  return null;
end;
$$;

create trigger appointments_broadcast_slots
  after insert or update on public.appointments
  for each row execute function private.booking_broadcast_slots();

-- ---------------------------------------------------------------------------------------------
-- API pública (RPC)
-- ---------------------------------------------------------------------------------------------

-- Horas libres de un día. Solo devuelve horas de inicio y los barberos libres: nada de clientes.
create function public.get_available_slots(
  p_service_id uuid,
  p_day        date,
  p_barber_id  uuid default null
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
      cross join lateral private.booking_offer(b.id, p_service_id) o
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

-- Reserva del cliente. Sin p_barber_id es "cualquiera disponible" (docs/04): el barbero libre
-- con menos citas ese día; si empatan, el que hace más tiempo no recibe una asignación así.
create function public.book_appointment(
  p_service_id uuid,
  p_start_at   timestamptz,
  p_barber_id  uuid default null
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
    v_code := private.booking_check('customer', p_barber_id, p_service_id, p_start_at);
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
      and private.booking_check('customer', b.id, p_service_id, p_start_at) is null
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
        select private.booking_check('customer', bs.barber_id, p_service_id, p_start_at) as code
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

  select o.price_cop into v_price from private.booking_offer(v_barber_id, p_service_id) o;

  return private.booking_insert(
    v_barber_id, v_customer_id, p_service_id, p_start_at,
    case when coalesce(v_requires, false) then 'pending_approval'::public.appointment_status
         else 'booked'::public.appointment_status end,
    'customer', v_auto, v_price, null
  );
end;
$$;

-- Cita creada por el personal, también para clientes sin cuenta. Sin reglas de anticipación.
create function public.staff_create_appointment(
  p_customer_id uuid,
  p_service_id  uuid,
  p_barber_id   uuid,
  p_start_at    timestamptz
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

  v_code := private.booking_check('staff', p_barber_id, p_service_id, p_start_at);
  if v_code is not null then
    raise exception '%', v_code;
  end if;

  select o.price_cop into v_price from private.booking_offer(p_barber_id, p_service_id) o;

  return private.booking_insert(
    p_barber_id, p_customer_id, p_service_id, p_start_at, 'booked', 'staff', false, v_price, null
  );
end;
$$;

-- Cancela. El cliente, hasta cancel_window_min antes; el personal, siempre y con motivo.
create function public.cancel_appointment(p_id uuid, p_reason text default null)
returns public.appointments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cfg public.booking_settings;
  v_row public.appointments;
  v_actor text;
  v_reason text := nullif(trim(p_reason), '');
begin
  if (select auth.uid()) is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_row from public.appointments where id = p_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  v_actor := private.booking_actor(v_row.barber_id, v_row.customer_id);
  if v_actor is null then
    raise exception 'NOT_FOUND';
  end if;
  if v_row.status not in ('pending_approval', 'booked', 'confirmed') then
    raise exception 'INVALID_STATUS';
  end if;

  select * into v_cfg from public.booking_settings where id;
  if v_actor = 'customer'
     and lower(v_row.period) < now() + make_interval(mins => v_cfg.cancel_window_min) then
    raise exception 'TOO_LATE_TO_CANCEL';
  end if;
  if v_actor = 'staff' and v_reason is null then
    raise exception 'REASON_REQUIRED';
  end if;

  update public.appointments
  set status = 'cancelled', cancelled_by = v_actor, cancel_reason = v_reason
  where id = p_id
  returning * into v_row;

  return v_row;
end;
$$;

-- Reprograma en una sola transacción: cancela la anterior y crea la nueva enlazada con
-- rescheduled_from. Si la hora nueva no está libre, falla todo y la anterior queda igual.
create function public.reschedule_appointment(
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

  v_code := private.booking_check(v_actor, v_barber_id, v_old.service_id, p_new_start_at, v_old.id);
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
    select o.price_cop into v_price from private.booking_offer(v_barber_id, v_old.service_id) o;
  end if;

  perform set_config('possos.rescheduling', v_old.id::text, true);
  update public.appointments
  set status = 'cancelled', cancelled_by = v_actor
  where id = v_old.id;
  perform set_config('possos.rescheduling', '', true);

  return private.booking_insert(
    v_barber_id, v_old.customer_id, v_old.service_id, p_new_start_at, v_status, v_actor,
    v_old.auto_assigned and v_barber_id = v_old.barber_id, v_price, v_old.id
  );
end;
$$;

-- Confirma una cita reservada. p_via: 'customer', 'staff' o 'whatsapp' (botón "Confirmo",
-- que llega por el servidor con la clave secreta). Confirmar dos veces no es error.
create function public.confirm_appointment(p_id uuid, p_via text default 'customer')
returns public.appointments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.appointments;
begin
  if p_via is null or p_via not in ('customer', 'staff', 'whatsapp') then
    raise exception 'INVALID_INPUT';
  end if;

  select * into v_row from public.appointments where id = p_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;

  if coalesce((select auth.role()), '') <> 'service_role' then
    if (select auth.uid()) is null then
      raise exception 'NOT_AUTHENTICATED';
    end if;
    if private.booking_actor(v_row.barber_id, v_row.customer_id) is null then
      raise exception 'NOT_FOUND';
    end if;
  end if;

  if v_row.status = 'confirmed' then
    return v_row;
  end if;
  if v_row.status <> 'booked' then
    raise exception 'INVALID_STATUS';
  end if;

  update public.appointments
  set status = 'confirmed', confirmed_at = now(), confirmed_via = p_via
  where id = p_id
  returning * into v_row;

  return v_row;
end;
$$;

-- El personal aprueba o rechaza una reserva pendiente.
create function public.decide_pending(p_id uuid, p_approve boolean)
returns public.appointments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.appointments;
begin
  if (select auth.uid()) is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if p_approve is null then
    raise exception 'INVALID_INPUT';
  end if;

  select * into v_row from public.appointments where id = p_id for update;
  if not found or not private.booking_is_staff_for(v_row.barber_id) then
    raise exception 'NOT_FOUND';
  end if;
  if v_row.status <> 'pending_approval' then
    raise exception 'INVALID_STATUS';
  end if;

  update public.appointments
  set status = case when p_approve then 'booked'::public.appointment_status
                    else 'rejected'::public.appointment_status end
  where id = p_id
  returning * into v_row;

  return v_row;
end;
$$;

-- Vino o no vino. Solo después de la hora de inicio. Cada inasistencia suma 1; al llegar a
-- no_show_threshold, las reservas del cliente necesitan aprobación (docs/04).
create function public.mark_attendance(p_id uuid, p_attended boolean)
returns public.appointments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cfg public.booking_settings;
  v_row public.appointments;
begin
  if (select auth.uid()) is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if p_attended is null then
    raise exception 'INVALID_INPUT';
  end if;

  select * into v_row from public.appointments where id = p_id for update;
  if not found or not private.booking_is_staff_for(v_row.barber_id) then
    raise exception 'NOT_FOUND';
  end if;
  if v_row.status not in ('booked', 'confirmed') then
    raise exception 'INVALID_STATUS';
  end if;
  if lower(v_row.period) > now() then
    raise exception 'NOT_STARTED';
  end if;

  update public.appointments
  set status = case when p_attended then 'completed'::public.appointment_status
                    else 'no_show'::public.appointment_status end
  where id = p_id
  returning * into v_row;

  if not p_attended then
    select * into v_cfg from public.booking_settings where id;
    insert into public.customer_booking_status as s (customer_id, no_show_count, requires_approval)
    values (v_row.customer_id, 1, 1 >= v_cfg.no_show_threshold)
    on conflict (customer_id) do update
    set no_show_count = s.no_show_count + 1,
        requires_approval = s.requires_approval or s.no_show_count + 1 >= v_cfg.no_show_threshold,
        updated_at = now();
  end if;

  return v_row;
end;
$$;

-- El administrador reinicia el contador de inasistencias y quita la marca de aprobación.
create function public.reset_no_shows(p_customer_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  insert into public.customer_booking_status as s (customer_id, no_show_count, requires_approval)
  values (p_customer_id, 0, false)
  on conflict (customer_id) do update
  set no_show_count = 0, requires_approval = false, updated_at = now();
end;
$$;

-- Citas que ocupan un periodo de un barbero. La usa la API de servidor después de
-- create_time_off() para decirle al barbero qué citas quedaron debajo del bloqueo.
create function public.list_conflicting_appointments(
  p_barber_id uuid,
  p_starts_at timestamptz,
  p_ends_at   timestamptz
)
returns table (
  id            uuid,
  start_at      timestamptz,
  end_at        timestamptz,
  status        public.appointment_status,
  customer_id   uuid,
  customer_name text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not private.booking_is_staff_for(p_barber_id) then
    raise exception 'FORBIDDEN';
  end if;
  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then
    raise exception 'INVALID_PERIOD';
  end if;

  return query
    select a.id, lower(a.period), upper(a.period), a.status, a.customer_id, c.full_name
    from public.appointments a
    join public.customers c on c.id = a.customer_id
    where a.barber_id = p_barber_id
      and a.status not in ('cancelled', 'rejected')
      and a.period && tstzrange(p_starts_at, p_ends_at, '[)')
    order by lower(a.period);
end;
$$;

-- Contrato público para notifications. Solo el servidor con la clave secreta (service_role).
create function public.get_appointment_for_notification(p_id uuid)
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
  select a.id, a.status, lower(a.period), upper(a.period), s.name, b.id, b.display_name,
         b.whatsapp_url, c.full_name, c.phone, c.whatsapp_opt_in
  from public.appointments a
  join public.services s on s.id = a.service_id
  join public.barbers b on b.id = a.barber_id
  join public.customers c on c.id = a.customer_id
  where a.id = p_id;
$$;

-- Permisos de las funciones: por omisión Supabase deja ejecutar todo a anon y authenticated.

revoke all on function public.get_available_slots(uuid, date, uuid) from public, anon, authenticated;
revoke all on function public.book_appointment(uuid, timestamptz, uuid) from public, anon, authenticated;
revoke all on function public.staff_create_appointment(uuid, uuid, uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.cancel_appointment(uuid, text) from public, anon, authenticated;
revoke all on function public.reschedule_appointment(uuid, timestamptz, uuid) from public, anon, authenticated;
revoke all on function public.confirm_appointment(uuid, text) from public, anon, authenticated;
revoke all on function public.decide_pending(uuid, boolean) from public, anon, authenticated;
revoke all on function public.mark_attendance(uuid, boolean) from public, anon, authenticated;
revoke all on function public.reset_no_shows(uuid) from public, anon, authenticated;
revoke all on function public.list_conflicting_appointments(uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.get_appointment_for_notification(uuid) from public, anon, authenticated;

grant execute on function public.get_available_slots(uuid, date, uuid) to anon, authenticated, service_role;
grant execute on function public.book_appointment(uuid, timestamptz, uuid) to authenticated;
grant execute on function public.staff_create_appointment(uuid, uuid, uuid, timestamptz) to authenticated;
grant execute on function public.cancel_appointment(uuid, text) to authenticated;
grant execute on function public.reschedule_appointment(uuid, timestamptz, uuid) to authenticated;
grant execute on function public.confirm_appointment(uuid, text) to authenticated, service_role;
grant execute on function public.decide_pending(uuid, boolean) to authenticated;
grant execute on function public.mark_attendance(uuid, boolean) to authenticated;
grant execute on function public.reset_no_shows(uuid) to authenticated;
grant execute on function public.list_conflicting_appointments(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.get_appointment_for_notification(uuid) to service_role;

-- ---------------------------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------------------------

alter table public.booking_settings enable row level security;
alter table public.appointments enable row level security;
alter table public.customer_booking_status enable row level security;
alter table public.booking_events enable row level security;

create policy booking_settings_select on public.booking_settings
  for select to authenticated
  using (true);

create policy booking_settings_admin_update on public.booking_settings
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke all on public.booking_settings from anon;
revoke insert, delete on public.booking_settings from authenticated;

create policy appointments_select on public.appointments
  for select to authenticated
  using (
    customer_id in (select c.id from public.customers c where c.user_id = (select auth.uid()))
    or barber_id = (select public.current_barber_id())
    or (select public.is_admin())
  );

-- Nadie escribe directo: solo las funciones de arriba.
revoke all on public.appointments from anon;
revoke insert, update, delete on public.appointments from authenticated;

create policy customer_booking_status_select on public.customer_booking_status
  for select to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.barber_customers bc
      where bc.customer_id = customer_booking_status.customer_id
        and bc.barber_id = (select public.current_barber_id())
    )
  );

revoke all on public.customer_booking_status from anon;
revoke insert, update, delete on public.customer_booking_status from authenticated;

-- booking_events: sin políticas. Solo el servidor (service_role) lo lee.
revoke all on public.booking_events from anon, authenticated;
