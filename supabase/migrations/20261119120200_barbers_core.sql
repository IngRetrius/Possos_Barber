-- Módulo barbers: barberos, servicios que hace cada uno, horario, bloqueos y portafolio (docs/09).

create extension if not exists btree_gist with schema extensions;

create table public.barbers (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid unique references auth.users (id) on delete set null,
  display_name      text not null check (length(trim(display_name)) > 0),
  bio               text,
  photo_path        text,
  active            boolean not null default true,
  slot_interval_min integer not null default 60
    check (slot_interval_min > 0 and slot_interval_min % 5 = 0),
  whatsapp_url      text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table public.barber_services (
  barber_id             uuid not null references public.barbers (id) on delete cascade,
  service_id            uuid not null references public.services (id) on delete cascade,
  price_cop_override    integer check (price_cop_override >= 0),
  duration_min_override integer
    check (duration_min_override > 0 and duration_min_override % 5 = 0),
  primary key (barber_id, service_id)
);

-- Hora local de Bogotá. Varios rangos por día permiten el almuerzo.
create table public.working_hours (
  id         uuid primary key default gen_random_uuid(),
  barber_id  uuid not null references public.barbers (id) on delete cascade,
  weekday    smallint not null check (weekday between 1 and 7), -- ISO: 1 lunes, 7 domingo
  start_time time not null,
  end_time   time not null,
  check (end_time > start_time)
);

create index working_hours_barber_weekday on public.working_hours (barber_id, weekday);

create table public.time_off (
  id         uuid primary key default gen_random_uuid(),
  barber_id  uuid not null references public.barbers (id) on delete cascade,
  period     tstzrange not null,
  reason     text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint time_off_period_is_half_open
    check (not isempty(period) and lower_inc(period) and not upper_inc(period)
           and not lower_inf(period) and not upper_inf(period)),
  constraint time_off_no_overlap
    exclude using gist (barber_id with =, period with &&)
);

create table public.portfolio_items (
  id         uuid primary key default gen_random_uuid(),
  barber_id  uuid not null references public.barbers (id) on delete cascade,
  image_path text not null,
  caption    text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index portfolio_items_barber on public.portfolio_items (barber_id, sort_order);

comment on table public.barbers is 'Módulo barbers.';
comment on table public.time_off is 'Módulo barbers. Se crean con create_time_off(), que toma el candado del barbero.';

-- current_barber_id(): el barbers.id del usuario actual si tiene el rol barber; si no, null.
create function public.current_barber_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select b.id
  from public.barbers b
  where b.user_id = (select auth.uid())
    and public.has_role('barber');
$$;

revoke all on function public.current_barber_id() from public, anon, authenticated;
grant execute on function public.current_barber_id() to anon, authenticated, service_role;

create function private.barbers_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger barbers_touch_updated_at
  before update on public.barbers
  for each row execute function private.barbers_touch_updated_at();

-- El barbero edita su perfil, pero no cambia su usuario, si está activo ni su intervalo.
create function private.barbers_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.role()) = 'authenticated'
     and not public.is_admin()
     and (new.user_id is distinct from old.user_id
          or new.active is distinct from old.active
          or new.slot_interval_min is distinct from old.slot_interval_min) then
    raise exception 'FORBIDDEN';
  end if;
  return new;
end;
$$;

create trigger barbers_guard_update
  before update on public.barbers
  for each row execute function private.barbers_guard_update();

-- create_time_off: crea un bloqueo con el mismo candado que toma el trigger de appointments
-- (select ... for update sobre barbers), para que un bloqueo y una reserva no se crucen.
-- Un bloqueo sí puede caer encima de citas existentes: es decisión del barbero. Para ver cuáles,
-- la API de servidor de booking llama después a list_conflicting_appointments().
create function public.create_time_off(
  p_barber_id uuid,
  p_starts_at timestamptz,
  p_ends_at   timestamptz,
  p_reason    text default null
)
returns public.time_off
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.time_off;
begin
  if (select auth.uid()) is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  -- coalesce: para quien no es barbero, current_barber_id() es null y la comparación también.
  if not coalesce(public.is_admin() or p_barber_id = public.current_barber_id(), false) then
    raise exception 'FORBIDDEN';
  end if;
  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then
    raise exception 'INVALID_PERIOD';
  end if;

  perform 1 from public.barbers where id = p_barber_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;

  insert into public.time_off (barber_id, period, reason, created_by)
  values (p_barber_id, tstzrange(p_starts_at, p_ends_at, '[)'), nullif(trim(p_reason), ''),
          (select auth.uid()))
  returning * into v_row;

  return v_row;
exception
  when exclusion_violation then
    raise exception 'TIME_OFF_OVERLAP';
end;
$$;

revoke all on function public.create_time_off(uuid, timestamptz, timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.create_time_off(uuid, timestamptz, timestamptz, text)
  to authenticated;

-- RLS

alter table public.barbers enable row level security;
alter table public.barber_services enable row level security;
alter table public.working_hours enable row level security;
alter table public.time_off enable row level security;
alter table public.portfolio_items enable row level security;

create policy barbers_select on public.barbers
  for select to anon, authenticated
  using (active or user_id = (select auth.uid()) or (select public.is_admin()));

create policy barbers_admin_insert on public.barbers
  for insert to authenticated
  with check ((select public.is_admin()));

create policy barbers_update on public.barbers
  for update to authenticated
  using ((select public.is_admin()) or id = (select public.current_barber_id()))
  with check ((select public.is_admin()) or id = (select public.current_barber_id()));

create policy barbers_admin_delete on public.barbers
  for delete to authenticated
  using ((select public.is_admin()));

create policy barber_services_select on public.barber_services
  for select to anon, authenticated
  using (true);

create policy barber_services_admin_write on public.barber_services
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy working_hours_select on public.working_hours
  for select to authenticated
  using ((select public.is_admin()) or barber_id = (select public.current_barber_id()));

create policy working_hours_write on public.working_hours
  for all to authenticated
  using ((select public.is_admin()) or barber_id = (select public.current_barber_id()))
  with check ((select public.is_admin()) or barber_id = (select public.current_barber_id()));

create policy time_off_select on public.time_off
  for select to authenticated
  using ((select public.is_admin()) or barber_id = (select public.current_barber_id()));

-- Los bloqueos se crean solo con create_time_off(). Borrar no necesita el candado.
create policy time_off_delete on public.time_off
  for delete to authenticated
  using ((select public.is_admin()) or barber_id = (select public.current_barber_id()));

create policy portfolio_items_select on public.portfolio_items
  for select to anon, authenticated
  using (true);

create policy portfolio_items_write on public.portfolio_items
  for all to authenticated
  using ((select public.is_admin()) or barber_id = (select public.current_barber_id()))
  with check ((select public.is_admin()) or barber_id = (select public.current_barber_id()));

revoke insert, update, delete on public.barbers, public.barber_services, public.working_hours,
  public.time_off, public.portfolio_items from anon;
revoke insert, update on public.time_off from authenticated;

-- Storage: fotos de barberos y portafolio. Lectura pública; escriben el administrador o el
-- barbero dueño de la carpeta <barber_id>/.

insert into storage.buckets (id, name, public)
values ('barber-photos', 'barber-photos', true), ('portfolio', 'portfolio', true)
on conflict (id) do nothing;

create policy barbers_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('barber-photos', 'portfolio')
    and ((select public.is_admin())
         or (storage.foldername(name))[1] = (select public.current_barber_id())::text)
  );

create policy barbers_storage_update on storage.objects
  for update to authenticated
  using (
    bucket_id in ('barber-photos', 'portfolio')
    and ((select public.is_admin())
         or (storage.foldername(name))[1] = (select public.current_barber_id())::text)
  );

create policy barbers_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('barber-photos', 'portfolio')
    and ((select public.is_admin())
         or (storage.foldername(name))[1] = (select public.current_barber_id())::text)
  );
