-- Reglas de esquema: RLS en todas las tablas de public (regla 4), la restricción de exclusión
-- existe (regla 3) y las funciones internas no se exponen.
begin;
select plan(8);

select is_empty(
  $$ select tablename from pg_tables where schemaname = 'public' and not rowsecurity $$,
  'Ninguna tabla de public queda sin RLS'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'no_double_booking'
      and conrelid = 'public.appointments'::regclass
      and contype = 'x'
  ),
  'appointments tiene la restricción de exclusión no_double_booking'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'time_off_no_overlap'
      and conrelid = 'public.time_off'::regclass
      and contype = 'x'
  ),
  'time_off tiene su restricción de exclusión'
);

select ok(
  not has_schema_privilege('anon', 'private', 'usage')
  and not has_schema_privilege('authenticated', 'private', 'usage'),
  'anon y authenticated no pueden usar el esquema private'
);

select ok(
  not has_function_privilege('authenticated', 'public.link_customer_to_barber(uuid, uuid)', 'execute'),
  'Nadie desde la app puede enlazarse con un cliente'
);

select ok(
  not has_function_privilege('authenticated', 'public.get_appointment_for_notification(uuid)', 'execute')
  and has_function_privilege('service_role', 'public.get_appointment_for_notification(uuid)', 'execute'),
  'get_appointment_for_notification es solo para service_role'
);

select ok(
  has_function_privilege('anon', 'public.get_available_slots(uuid, date, uuid, uuid[])', 'execute')
  and not has_function_privilege('anon', 'public.book_appointment(uuid, timestamptz, uuid, uuid[])', 'execute'),
  'anon consulta horas libres pero no reserva'
);

select ok(
  not has_table_privilege('authenticated', 'public.appointments', 'insert')
  and not has_table_privilege('authenticated', 'public.appointments', 'update')
  and not has_table_privilege('authenticated', 'public.appointments', 'delete'),
  'authenticated no puede escribir directo en appointments'
);

select * from finish();
rollback;
