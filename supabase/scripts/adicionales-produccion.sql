-- Paso del catálogo de Beunik a servicios con adicionales (pedido de Juan, 20/11/2026).
--
-- Antes había un servicio por combinación ("Corte con barba y cejas"). El precio de cada combo era
-- la suma exacta del corte y sus adicionales, así que se reemplazan por:
--
--   Corte ($25.000, 60 min) con Barba (+$15.000, +60 min), Cejas (+$5.000) y Diseño (+$5.000).
--   Corte + barba + diseño ($45.000) y Corte con todo ($50.000) son combinaciones nuevas: la
--   decisión del 20/11/2026 es que se sumen.
--   Rayos platinados y Global platinado van en el grupo "Color de cabello".
--   Corte a domicilio sigue solo.
--
-- Se corre una vez en producción, después de aplicar las migraciones 20261120120000 y
-- 20261120120100 (`pnpm db:push`):
--
--   psql "$DATABASE_URL" -f supabase/scripts/adicionales-produccion.sql
--
-- Los combos se desactivan, no se borran: las citas que ya existen los siguen nombrando. Una cita
-- futura de un combo desactivado ya no se puede mover desde Mis citas (el cliente puede cancelarla
-- o escribirle al barbero); el script dice cuántas hay antes de seguir.
--
-- Se puede correr dos veces: lo que ya existe no cambia. Todo pasa en una transacción.

\set ON_ERROR_STOP on

begin;

-- Los nombres tal como quedaron cargados desde Beunik.
create temp table combos (name text primary key) on commit drop;
insert into combos values
  ('Corte con cejas'),
  ('Corte con diseño'),
  ('Corte + cejas + diseño'),
  ('Corte con barba'),
  ('Corte con barba y cejas');

do $$
declare
  v_corte uuid;
  v_future integer;
begin
  select id into v_corte from public.services where name = 'Corte' and active;
  if v_corte is null then
    raise exception 'No hay un servicio activo llamado Corte';
  end if;

  select count(*) into v_future
  from public.appointments a
  join public.services s on s.id = a.service_id
  join combos c on c.name = s.name
  where a.status in ('pending_approval', 'booked', 'confirmed')
    and upper(a.period) > now();
  raise notice 'Citas futuras de combos que quedan sin "Cambiar hora": %', v_future;

  insert into public.service_addons (service_id, name, price_cop, duration_min, sort_order)
  select v_corte, x.name, x.price, x.minutes, x.ord
  from (values ('Barba', 15000, 60, 1), ('Cejas', 5000, 0, 2), ('Diseño', 5000, 0, 3))
         as x(name, price, minutes, ord)
  where not exists (
    select 1 from public.service_addons a where a.service_id = v_corte and a.name = x.name
  );
end;
$$;

update public.services
set category = 'Color de cabello'
where name in ('Rayos platinados', 'Global platinado') and category is distinct from 'Color de cabello';

update public.services s
set active = false
from combos c
where s.name = c.name and s.active;

-- Cómo queda: lo que ve el cliente en el inicio.
select s.name, s.category, s.price_cop, s.duration_min,
       (select string_agg(a.name || ' +' || coalesce(a.price_cop::text, '[PENDIENTE]'), ', '
                          order by a.sort_order)
        from public.service_addons a where a.service_id = s.id and a.active) as adicionales
from public.services s
where s.active
order by s.sort_order, s.name;

commit;
