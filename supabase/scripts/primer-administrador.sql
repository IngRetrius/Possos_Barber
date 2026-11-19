-- Primer administrador (F3). Nunca se crea desde la interfaz (docs/06).
--
-- Le da a una cuenta que ya existe los roles de administrador y barbero, su fila en `barbers`
-- y su porcentaje del 50 % en `commission_rates` (decisión del dueño, 19/11/2026). Sin esa
-- fila no puede registrar cobros (NO_COMMISSION_RATE).
--
-- Antes: el dueño crea su cuenta en el sitio (con Google o con correo, y la activa).
-- El correo y el nombre se pasan como parámetros; no van en el repo:
--
--   DATABASE_URL=... ADMIN_EMAIL=... ADMIN_NAME="Nombre visible" pnpm db:primer-admin
--
-- Se puede correr dos veces: lo que ya existe no cambia. Todo pasa en una transacción.

\set ON_ERROR_STOP on

-- Con pnpm db:primer-admin las variables siempre existen; vacías cuentan como faltantes.
\if :{?email}
\else
  \set email ''
\endif
\if :{?nombre}
\else
  \set nombre ''
\endif
select trim(:'email') <> '' as has_email, trim(:'nombre') <> '' as has_name \gset
\if :has_email
\else
  \echo 'Falta el correo: ADMIN_EMAIL=correo@dominio (o -v email=... con psql).'
  \quit
\endif
\if :has_name
\else
  \echo 'Falta el nombre visible del barbero: ADMIN_NAME="..." (o -v nombre=... con psql).'
  \quit
\endif

begin;

-- Si el correo no tiene cuenta, \gset no recibe filas y el script se detiene sin cambiar nada.
select id as admin_user_id
from auth.users
where lower(email) = lower(trim(:'email'))
\gset

insert into public.staff_roles (user_id, role) values
  (:'admin_user_id', 'admin'),
  (:'admin_user_id', 'barber')
on conflict do nothing;

insert into public.barbers (user_id, display_name)
values (:'admin_user_id', trim(:'nombre'))
on conflict (user_id) do nothing;

select id as admin_barber_id from public.barbers where user_id = :'admin_user_id' \gset

insert into public.commission_rates (barber_id, barber_pct, updated_by)
values (:'admin_barber_id', 50, :'admin_user_id')
on conflict (barber_id) do nothing;

commit;

select b.display_name as barbero,
       array_agg(distinct r.role::text order by r.role::text) as roles,
       c.barber_pct as porcentaje
from public.barbers b
join public.staff_roles r on r.user_id = b.user_id
left join public.commission_rates c on c.barber_id = b.id
where b.user_id = :'admin_user_id'
group by b.display_name, c.barber_pct;
