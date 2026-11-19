-- Módulo customers: clientes, relación barbero-cliente y notas del barbero (docs/09).
--
-- Un barbero ve a un cliente solo si existe barber_customers con él (decisión del dueño,
-- docs/06). booking crea esa relación con link_customer_to_barber() al crear cada cita.

create table public.customers (
  id                  uuid primary key default gen_random_uuid(),
  -- Null si lo creó el personal y la persona no tiene cuenta.
  user_id             uuid unique references auth.users (id) on delete set null,
  full_name           text not null check (length(trim(full_name)) > 0),
  -- Celular colombiano en E.164 (+57 y 10 dígitos). La validación detallada es de F3.
  phone               text check (phone ~ '^\+57[0-9]{10}$'),
  email               text,
  whatsapp_opt_in     boolean not null default false,
  data_consent_at     timestamptz,
  data_policy_version text,
  created_by          uuid default auth.uid() references auth.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- Ley 1581: quien se registra no guarda su perfil sin autorizar el tratamiento de datos.
  constraint customers_account_has_consent
    check (user_id is null
           or (phone is not null and data_consent_at is not null and data_policy_version is not null))
);

create table public.barber_customers (
  barber_id     uuid not null references public.barbers (id) on delete cascade,
  customer_id   uuid not null references public.customers (id) on delete cascade,
  first_seen_at timestamptz not null default now(),
  primary key (barber_id, customer_id)
);

create index barber_customers_customer on public.barber_customers (customer_id);

create table public.customer_notes (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  barber_id   uuid not null references public.barbers (id) on delete cascade,
  body        text not null check (length(trim(body)) > 0),
  created_at  timestamptz not null default now()
);

create index customer_notes_customer on public.customer_notes (customer_id, barber_id);

comment on table public.customers is 'Módulo customers. El teléfono nunca se muestra a otro cliente (regla 7).';

create function private.customers_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger customers_touch_updated_at
  before update on public.customers
  for each row execute function private.customers_touch_updated_at();

-- link_customer_to_barber: la llama booking al crear cada cita. Nadie la llama desde la app:
-- si un barbero pudiera llamarla, podría verse con cualquier cliente.
create function public.link_customer_to_barber(p_customer_id uuid, p_barber_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.barber_customers (barber_id, customer_id)
  values (p_barber_id, p_customer_id)
  on conflict do nothing;
$$;

revoke all on function public.link_customer_to_barber(uuid, uuid) from public, anon, authenticated;

-- staff_create_customer: el personal registra a un cliente sin cuenta (cita manual, docs/04).
-- Si quien lo crea es barbero, queda enlazado con él para que lo vea.
create function public.staff_create_customer(
  p_full_name       text,
  p_phone           text default null,
  p_email           text default null,
  p_whatsapp_opt_in boolean default false
)
returns public.customers
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_barber_id uuid := public.current_barber_id();
  v_row public.customers;
begin
  if (select auth.uid()) is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if not public.is_admin() and v_barber_id is null then
    raise exception 'FORBIDDEN';
  end if;

  insert into public.customers (user_id, full_name, phone, email, whatsapp_opt_in, created_by)
  values (null, trim(p_full_name), nullif(trim(p_phone), ''), nullif(trim(p_email), ''),
          coalesce(p_whatsapp_opt_in, false), (select auth.uid()))
  returning * into v_row;

  if v_barber_id is not null then
    perform public.link_customer_to_barber(v_row.id, v_barber_id);
  end if;

  return v_row;
exception
  when check_violation then
    raise exception 'INVALID_CUSTOMER';
end;
$$;

revoke all on function public.staff_create_customer(text, text, text, boolean)
  from public, anon, authenticated;
grant execute on function public.staff_create_customer(text, text, text, boolean) to authenticated;

-- RLS

alter table public.customers enable row level security;
alter table public.barber_customers enable row level security;
alter table public.customer_notes enable row level security;

create policy customers_select on public.customers
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_admin())
    or exists (
      select 1 from public.barber_customers bc
      where bc.customer_id = customers.id
        and bc.barber_id = (select public.current_barber_id())
    )
  );

-- Cada quien crea solo su propio perfil. El personal crea clientes con staff_create_customer().
create policy customers_insert_self on public.customers
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- Lo propio; y el personal edita clientes sin cuenta que ve.
create policy customers_update on public.customers
  for update to authenticated
  using (
    user_id = (select auth.uid())
    or (user_id is null and (
      (select public.is_admin())
      or exists (
        select 1 from public.barber_customers bc
        where bc.customer_id = customers.id
          and bc.barber_id = (select public.current_barber_id())
      )
    ))
  )
  with check (
    user_id = (select auth.uid())
    or (user_id is null and (
      (select public.is_admin())
      or exists (
        select 1 from public.barber_customers bc
        where bc.customer_id = customers.id
          and bc.barber_id = (select public.current_barber_id())
      )
    ))
  );

-- Columnas que se pueden escribir. user_id, created_by y las fechas no se tocan desde la app.
revoke all on public.customers from anon;
revoke insert, update, delete on public.customers from authenticated;
grant insert (user_id, full_name, phone, email, whatsapp_opt_in, data_consent_at, data_policy_version)
  on public.customers to authenticated;
grant update (full_name, phone, email, whatsapp_opt_in, data_consent_at, data_policy_version)
  on public.customers to authenticated;

create policy barber_customers_select on public.barber_customers
  for select to authenticated
  using ((select public.is_admin()) or barber_id = (select public.current_barber_id()));

revoke all on public.barber_customers from anon;
revoke insert, update, delete on public.barber_customers from authenticated;

create policy customer_notes_select on public.customer_notes
  for select to authenticated
  using ((select public.is_admin()) or barber_id = (select public.current_barber_id()));

create policy customer_notes_insert on public.customer_notes
  for insert to authenticated
  with check (
    (select public.is_admin())
    or (barber_id = (select public.current_barber_id())
        and exists (
          select 1 from public.barber_customers bc
          where bc.customer_id = customer_notes.customer_id
            and bc.barber_id = customer_notes.barber_id
        ))
  );

create policy customer_notes_update on public.customer_notes
  for update to authenticated
  using ((select public.is_admin()) or barber_id = (select public.current_barber_id()))
  with check ((select public.is_admin()) or barber_id = (select public.current_barber_id()));

create policy customer_notes_delete on public.customer_notes
  for delete to authenticated
  using ((select public.is_admin()) or barber_id = (select public.current_barber_id()));

revoke all on public.customer_notes from anon;
