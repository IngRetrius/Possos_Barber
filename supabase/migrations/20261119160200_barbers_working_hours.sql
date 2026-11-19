-- Módulo barbers: guardar el horario semanal completo de una vez (F6, pantalla "Horario").
--
-- El panel edita la semana entera (varios rangos por día) y la guarda en una sola transacción:
-- borrar y volver a insertar por PostgREST serían dos llamadas, y si la segunda falla el barbero
-- quedaría sin horario. Toma el mismo candado del barbero que create_time_off y el trigger de
-- appointments. Las citas que ya existen no se tocan aunque queden fuera del horario nuevo.
--
-- p_ranges: [{"weekday": 1, "start_time": "09:00", "end_time": "12:00"}, ...] (ISO: 1 lunes).

create function public.set_working_hours(p_barber_id uuid, p_ranges jsonb)
returns setof public.working_hours
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if (select auth.uid()) is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  -- coalesce: para quien no es barbero, current_barber_id() es null y la comparación también.
  if not coalesce(public.is_admin() or p_barber_id = public.current_barber_id(), false) then
    raise exception 'FORBIDDEN';
  end if;
  if p_ranges is null or jsonb_typeof(p_ranges) <> 'array' then
    raise exception 'INVALID_INPUT';
  end if;

  perform 1 from public.barbers where id = p_barber_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;

  begin
    select count(*) into v_count
    from jsonb_to_recordset(p_ranges) as r (weekday smallint, start_time time, end_time time)
    where r.weekday is null or r.weekday not between 1 and 7
       or r.start_time is null or r.end_time is null or r.end_time <= r.start_time;
  exception
    when invalid_text_representation or invalid_datetime_format or datetime_field_overflow
      or numeric_value_out_of_range or invalid_parameter_value then
      raise exception 'INVALID_INPUT';
  end;
  if v_count > 0 then
    raise exception 'INVALID_INPUT';
  end if;

  -- Dos rangos del mismo día no se cruzan (pueden tocarse: 9 a 12 y 12 a 14).
  if exists (
    with r as (
      select x.weekday, x.start_time, x.end_time, row_number() over () as n
      from jsonb_to_recordset(p_ranges) as x (weekday smallint, start_time time, end_time time)
    )
    select 1
    from r a
    join r b on a.weekday = b.weekday and a.n < b.n
    where a.start_time < b.end_time and b.start_time < a.end_time
  ) then
    raise exception 'HOURS_OVERLAP';
  end if;

  delete from public.working_hours where barber_id = p_barber_id;
  insert into public.working_hours (barber_id, weekday, start_time, end_time)
  select p_barber_id, x.weekday, x.start_time, x.end_time
  from jsonb_to_recordset(p_ranges) as x (weekday smallint, start_time time, end_time time);

  return query
    select * from public.working_hours wh
    where wh.barber_id = p_barber_id
    order by wh.weekday, wh.start_time;
end;
$$;

revoke all on function public.set_working_hours(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.set_working_hours(uuid, jsonb) to authenticated;
