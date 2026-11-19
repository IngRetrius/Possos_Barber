-- Módulo commissions: cobros por servicio y liquidación barbero / barbería (docs/09).
--
-- Reemplaza las "facturas" de Beunik, que solo reparten el valor de cada servicio con un
-- porcentaje que fija el administrador. No es factura electrónica de la DIAN.
-- Lee las citas con private.booking_appointment() (API de booking) y nunca escribe en sus tablas.

create table public.commission_rates (
  barber_id  uuid primary key references public.barbers (id) on delete cascade,
  barber_pct numeric(5, 2) not null check (barber_pct between 0 and 100),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create table public.charges (
  id                  uuid primary key default gen_random_uuid(),
  appointment_id      uuid not null unique references public.appointments (id),
  barber_id           uuid not null references public.barbers (id),
  service_id          uuid not null references public.services (id),
  amount_cop          integer not null check (amount_cop >= 0),
  -- Copia del porcentaje vigente al cobrar: cambiarlo después no altera cobros anteriores.
  barber_pct          numeric(5, 2) not null check (barber_pct between 0 and 100),
  barber_amount_cop   integer generated always as
                        (round(amount_cop * barber_pct / 100)::integer) stored,
  business_amount_cop integer generated always as
                        (amount_cop - round(amount_cop * barber_pct / 100)::integer) stored,
  charged_at          timestamptz not null default now(),
  created_by          uuid references auth.users (id) on delete set null,
  updated_at          timestamptz not null default now(),
  voided_at           timestamptz,
  void_reason         text,
  constraint charges_void_has_reason check (voided_at is null or void_reason is not null)
);

create index charges_barber_charged_at on public.charges (barber_id, charged_at);

comment on table public.charges is 'Módulo commissions. Un cobro por cita completed. No es factura de la DIAN.';

-- ---------------------------------------------------------------------------------------------
-- Funciones
-- ---------------------------------------------------------------------------------------------

-- Registra el cobro de una cita completed. Sin p_amount_cop usa el precio de la reserva.
create function public.record_charge(p_appointment_id uuid, p_amount_cop integer default null)
returns public.charges
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_appt record;
  v_pct numeric(5, 2);
  v_amount integer;
  v_row public.charges;
begin
  if (select auth.uid()) is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_appt from private.booking_appointment(p_appointment_id);
  if not found
     or not coalesce(public.is_admin() or v_appt.barber_id = public.current_barber_id(), false) then
    raise exception 'NOT_FOUND';
  end if;
  if v_appt.status <> 'completed' then
    raise exception 'NOT_COMPLETED';
  end if;
  if exists (select 1 from public.charges c where c.appointment_id = p_appointment_id) then
    raise exception 'ALREADY_CHARGED';
  end if;

  v_amount := coalesce(p_amount_cop, v_appt.price_cop);
  if v_amount is null or v_amount < 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  select r.barber_pct into v_pct from public.commission_rates r where r.barber_id = v_appt.barber_id;
  if v_pct is null then
    raise exception 'NO_COMMISSION_RATE';
  end if;

  insert into public.charges (appointment_id, barber_id, service_id, amount_cop, barber_pct, created_by)
  values (v_appt.id, v_appt.barber_id, v_appt.service_id, v_amount, v_pct, (select auth.uid()))
  returning * into v_row;

  return v_row;
exception
  when unique_violation then
    raise exception 'ALREADY_CHARGED';
end;
$$;

-- Corrige el monto. El barbero, solo sus cobros del mismo día (hora de Bogotá); el admin, todos.
-- El porcentaje copiado no cambia.
create function public.update_charge(p_id uuid, p_amount_cop integer)
returns public.charges
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.charges;
  v_tz text := 'America/Bogota';
begin
  if (select auth.uid()) is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if p_amount_cop is null or p_amount_cop < 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  select * into v_row from public.charges where id = p_id for update;
  if not found
     or not coalesce(public.is_admin() or v_row.barber_id = public.current_barber_id(), false) then
    raise exception 'NOT_FOUND';
  end if;
  if v_row.voided_at is not null then
    raise exception 'INVALID_STATUS';
  end if;
  if not public.is_admin()
     and (v_row.charged_at at time zone v_tz)::date <> (now() at time zone v_tz)::date then
    raise exception 'TOO_LATE_TO_EDIT';
  end if;

  update public.charges
  set amount_cop = p_amount_cop, updated_at = now()
  where id = p_id
  returning * into v_row;

  return v_row;
end;
$$;

-- Anula un cobro con motivo. No se borra. Solo el administrador.
create function public.void_charge(p_id uuid, p_reason text)
returns public.charges
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.charges;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  if nullif(trim(p_reason), '') is null then
    raise exception 'REASON_REQUIRED';
  end if;

  select * into v_row from public.charges where id = p_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if v_row.voided_at is not null then
    raise exception 'INVALID_STATUS';
  end if;

  update public.charges
  set voided_at = now(), void_reason = trim(p_reason), updated_at = now()
  where id = p_id
  returning * into v_row;

  return v_row;
end;
$$;

-- Liquidación de un periodo (fechas de Bogotá, ambas incluidas), por barbero y sin anulados.
-- El barbero solo ve la suya. El administrador, sin p_barber_id, ve una fila por barbero; la de
-- la barbería es la suma de business_amount_cop.
create function public.get_settlement(p_from date, p_to date, p_barber_id uuid default null)
returns table (
  barber_id           uuid,
  services_count      integer,
  amount_cop          bigint,
  barber_amount_cop   bigint,
  business_amount_cop bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_own uuid := public.current_barber_id();
  v_target uuid;
  v_tz text := 'America/Bogota';
begin
  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'INVALID_PERIOD';
  end if;

  if public.is_admin() then
    v_target := p_barber_id;
  elsif v_own is not null and (p_barber_id is null or p_barber_id = v_own) then
    v_target := v_own;
  else
    raise exception 'FORBIDDEN';
  end if;

  return query
    select c.barber_id,
           count(*)::integer,
           sum(c.amount_cop)::bigint,
           sum(c.barber_amount_cop)::bigint,
           sum(c.business_amount_cop)::bigint
    from public.charges c
    where c.voided_at is null
      and c.charged_at >= (p_from::timestamp at time zone v_tz)
      and c.charged_at < ((p_to + 1)::timestamp at time zone v_tz)
      and (v_target is null or c.barber_id = v_target)
    group by c.barber_id
    order by c.barber_id;
end;
$$;

revoke all on function public.record_charge(uuid, integer) from public, anon, authenticated;
revoke all on function public.update_charge(uuid, integer) from public, anon, authenticated;
revoke all on function public.void_charge(uuid, text) from public, anon, authenticated;
revoke all on function public.get_settlement(date, date, uuid) from public, anon, authenticated;

grant execute on function public.record_charge(uuid, integer) to authenticated;
grant execute on function public.update_charge(uuid, integer) to authenticated;
grant execute on function public.void_charge(uuid, text) to authenticated;
grant execute on function public.get_settlement(date, date, uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------------------------

alter table public.commission_rates enable row level security;
alter table public.charges enable row level security;

create policy commission_rates_select on public.commission_rates
  for select to authenticated
  using ((select public.is_admin()) or barber_id = (select public.current_barber_id()));

create policy commission_rates_admin_write on public.commission_rates
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke all on public.commission_rates from anon;

create policy charges_select on public.charges
  for select to authenticated
  using ((select public.is_admin()) or barber_id = (select public.current_barber_id()));

-- Los cobros solo se escriben con las funciones de arriba.
revoke all on public.charges from anon;
revoke insert, update, delete on public.charges from authenticated;
