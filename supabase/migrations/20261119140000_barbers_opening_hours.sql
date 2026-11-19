-- Módulo barbers: horario de atención para la página pública (F4).
--
-- working_hours solo la ven el barbero y el administrador (RLS). La página pública necesita el
-- horario de la barbería, que es la unión de los horarios de los barberos activos: esta función
-- lo devuelve sin decir de quién es cada rango. Los rangos que se cruzan o se tocan se juntan.

create function public.get_opening_hours()
returns table (weekday smallint, start_time time, end_time time)
language sql
stable
security definer
set search_path = ''
as $$
  with ranges as (
    select distinct wh.weekday as wd, wh.start_time as st, wh.end_time as et
    from public.working_hours wh
    join public.barbers b on b.id = wh.barber_id
    where b.active
  ),
  marked as (
    -- Un rango abre grupo si empieza después de que terminaron todos los anteriores del día.
    select r.wd, r.st, r.et,
           case when r.st <= max(r.et) over (
                  partition by r.wd order by r.st, r.et
                  rows between unbounded preceding and 1 preceding)
                then 0 else 1 end as opens
    from ranges r
  ),
  grouped as (
    select m.wd, m.st, m.et,
           sum(m.opens) over (partition by m.wd order by m.st, m.et) as grp
    from marked m
  )
  select g.wd, min(g.st), max(g.et)
  from grouped g
  group by g.wd, g.grp
  order by 1, 2;
$$;

revoke all on function public.get_opening_hours() from public, anon, authenticated;
grant execute on function public.get_opening_hours() to anon, authenticated, service_role;
