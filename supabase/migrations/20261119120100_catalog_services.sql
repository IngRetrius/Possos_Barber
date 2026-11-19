-- Módulo catalog: servicios (docs/09).

create table public.services (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(trim(name)) > 0),
  description  text,
  duration_min integer not null check (duration_min > 0 and duration_min % 5 = 0),
  -- Null mientras el dueño no confirme el precio ([PENDIENTE], regla 8 de CLAUDE.md).
  price_cop    integer check (price_cop >= 0),
  active       boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.services is 'Módulo catalog. price_cop null significa precio por confirmar.';

create function private.catalog_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger services_touch_updated_at
  before update on public.services
  for each row execute function private.catalog_touch_updated_at();

alter table public.services enable row level security;

create policy services_select_active on public.services
  for select to anon, authenticated
  using (active or (select public.is_admin()));

create policy services_admin_write on public.services
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke insert, update, delete on public.services from anon;
