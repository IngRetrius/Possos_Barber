-- Módulo catalog: grupos de servicios y adicionales (pedido de Juan, 20/11/2026; docs/09).
--
-- 1. services.category: nombre del grupo con que se muestra el servicio en el inicio ("Color de
--    cabello"). Null: el servicio va solo, sin título de grupo. Los servicios con el mismo texto
--    van juntos.
-- 2. service_addons: lo que se agrega a un servicio (barba, cejas, diseño). Cada adicional suma
--    su precio y sus minutos a los del servicio; se pueden combinar todos (decisión del 20/11/2026).
--    Reemplaza los combos de Beunik ("Corte con barba y cejas"): el precio de cada combo era la
--    suma exacta del corte y sus adicionales.

alter table public.services
  add column category text check (category is null or length(trim(category)) > 0);

comment on column public.services.category is
  'Grupo con que se muestra en el inicio ("Color de cabello"). Null: va solo.';

create table public.service_addons (
  id           uuid primary key default gen_random_uuid(),
  service_id   uuid not null references public.services (id) on delete cascade,
  name         text not null check (length(trim(name)) > 0),
  -- Null mientras el dueño no confirme el precio ([PENDIENTE], regla 8 de CLAUDE.md).
  price_cop    integer check (price_cop >= 0),
  -- Minutos que suma a la cita. 0: se hace en el mismo tiempo del servicio (cejas, diseño).
  duration_min integer not null default 0 check (duration_min >= 0 and duration_min % 5 = 0),
  active       boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index service_addons_service on public.service_addons (service_id, sort_order);

comment on table public.service_addons is
  'Módulo catalog. Adicionales de un servicio: suman precio y minutos. price_cop null: por confirmar.';

create trigger service_addons_touch_updated_at
  before update on public.service_addons
  for each row execute function private.catalog_touch_updated_at();

alter table public.service_addons enable row level security;

-- Como services: todos ven los activos; el administrador ve y cambia todo.
create policy service_addons_select_active on public.service_addons
  for select to anon, authenticated
  using (active or (select public.is_admin()));

create policy service_addons_admin_write on public.service_addons
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke insert, update, delete on public.service_addons from anon;
