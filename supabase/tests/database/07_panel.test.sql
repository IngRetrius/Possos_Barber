-- F6: lo que usa el panel. La agenda en vivo (Realtime), el horario semanal de una vez, el
-- cliente creado por el personal con la autorización de palabra y la matriz de docs/06 del
-- barbero (B, sin administrador) frente al administrador (owner, barbero A).
begin;
\ir ../fixtures/setup.psql
select plan(42);

-- ---------------------------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------------------------
select ok(
  exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'appointments'
  ),
  'appointments está en la publicación de Realtime (Postgres Changes del panel)'
);

-- ---------------------------------------------------------------------------------------------
-- set_working_hours
-- ---------------------------------------------------------------------------------------------
select ok(
  not has_function_privilege('anon', 'public.set_working_hours(uuid, jsonb)', 'execute'),
  'anon no puede llamar set_working_hours'
);

select tests.login('b0000000-0000-0000-0000-000000000001');

select lives_ok(
  $$ select public.set_working_hours('bbbbbbbb-0000-0000-0000-000000000001',
       '[{"weekday": 1, "start_time": "09:00", "end_time": "12:00"},
         {"weekday": 1, "start_time": "12:00", "end_time": "18:00"},
         {"weekday": 6, "start_time": "08:00", "end_time": "13:00"}]') $$,
  'El barbero guarda su horario, con rangos que se tocan'
);

select results_eq(
  $$ select weekday::integer, start_time, end_time from public.working_hours
     where barber_id = 'bbbbbbbb-0000-0000-0000-000000000001' order by weekday, start_time $$,
  $$ values (1, '09:00'::time, '12:00'::time), (1, '12:00'::time, '18:00'::time),
            (6, '08:00'::time, '13:00'::time) $$,
  'El horario anterior se reemplaza completo'
);

select throws_ok(
  $$ select public.set_working_hours('bbbbbbbb-0000-0000-0000-000000000001',
       '[{"weekday": 2, "start_time": "09:00", "end_time": "12:00"},
         {"weekday": 2, "start_time": "11:00", "end_time": "14:00"}]') $$,
  'P0001', 'HOURS_OVERLAP',
  'Dos rangos del mismo día que se cruzan dan HOURS_OVERLAP'
);

select throws_ok(
  $$ select public.set_working_hours('bbbbbbbb-0000-0000-0000-000000000001',
       '[{"weekday": 8, "start_time": "09:00", "end_time": "12:00"}]') $$,
  'P0001', 'INVALID_INPUT',
  'Un día fuera de 1 a 7 da INVALID_INPUT'
);

select throws_ok(
  $$ select public.set_working_hours('bbbbbbbb-0000-0000-0000-000000000001',
       '[{"weekday": 3, "start_time": "12:00", "end_time": "09:00"}]') $$,
  'P0001', 'INVALID_INPUT',
  'Un rango que termina antes de empezar da INVALID_INPUT'
);

select throws_ok(
  $$ select public.set_working_hours('bbbbbbbb-0000-0000-0000-000000000001',
       '[{"weekday": 3, "start_time": "nueve", "end_time": "12:00"}]') $$,
  'P0001', 'INVALID_INPUT',
  'Una hora que no es hora da INVALID_INPUT'
);

select results_eq(
  $$ select count(*)::integer from public.working_hours
     where barber_id = 'bbbbbbbb-0000-0000-0000-000000000001' $$,
  $$ values (3) $$,
  'Si falla, el horario guardado no cambia'
);

select throws_ok(
  $$ select public.set_working_hours('aaaaaaaa-0000-0000-0000-000000000001', '[]') $$,
  'P0001', 'FORBIDDEN',
  'El barbero no cambia el horario de otro'
);
reset role;

select tests.login('c0000000-0000-0000-0000-000000000001');
select throws_ok(
  $$ select public.set_working_hours('aaaaaaaa-0000-0000-0000-000000000001', '[]') $$,
  'P0001', 'FORBIDDEN',
  'Un cliente no cambia horarios (current_barber_id() null no abre la guarda)'
);
reset role;

select tests.login('a0000000-0000-0000-0000-000000000001');
select lives_ok(
  $$ select public.set_working_hours('bbbbbbbb-0000-0000-0000-000000000001',
       (select jsonb_agg(jsonb_build_object('weekday', d, 'start_time', '06:00', 'end_time', '22:00'))
        from generate_series(1, 7) d)) $$,
  'El administrador cambia el horario de cualquier barbero'
);
reset role;

-- ---------------------------------------------------------------------------------------------
-- Cliente creado por el personal con la autorización de palabra (Ley 1581)
-- ---------------------------------------------------------------------------------------------
select tests.login('b0000000-0000-0000-0000-000000000001');

select public.staff_create_customer('Con Autorizacion', '+573001110000', null, true, 'v-prueba');
select public.staff_create_customer('Sin Autorizacion', '+573001110001');

select results_eq(
  $$ select data_policy_version, data_consent_at is not null from public.customers
     where full_name = 'Con Autorizacion' $$,
  $$ values ('v-prueba'::text, true) $$,
  'Con la versión de la política, la base guarda la hora de la autorización'
);

select results_eq(
  $$ select data_policy_version, data_consent_at is null from public.customers
     where full_name = 'Sin Autorizacion' $$,
  $$ values (null::text, true) $$,
  'Sin versión, el cliente queda sin autorización registrada'
);

select throws_ok(
  $$ select public.staff_create_customer('Malo', '+57123') $$,
  'P0001', 'INVALID_CUSTOMER',
  'Un celular mal escrito da INVALID_CUSTOMER'
);
reset role;

select tests.login('c0000000-0000-0000-0000-000000000001');
select throws_ok(
  $$ select public.staff_create_customer('Intruso', '+573001110002', null, false, 'v') $$,
  'P0001', 'FORBIDDEN',
  'Un cliente no crea clientes'
);
reset role;

-- ---------------------------------------------------------------------------------------------
-- Matriz de docs/06: barbero frente a administrador
-- ---------------------------------------------------------------------------------------------
-- Un bloqueo del barbero A para probar el borrado ajeno.
insert into public.time_off (barber_id, period, reason) values
  ('aaaaaaaa-0000-0000-0000-000000000001',
   tstzrange(tests.at(3, '12:00'), tests.at(3, '13:00'), '[)'), 'Almuerzo de A');

select tests.login('b0000000-0000-0000-0000-000000000001');

-- Servicios y barberos: solo el administrador los crea y edita.
select throws_ok(
  $$ insert into public.services (name, duration_min) values ('De B', 30) $$,
  '42501', null,
  'El barbero no crea servicios'
);

update public.services set price_cop = 1 where id = '5e000000-0000-0000-0000-000000000001';
select results_eq(
  $$ select price_cop from public.services where id = '5e000000-0000-0000-0000-000000000001' $$,
  $$ values (30000) $$,
  'El barbero no cambia el precio de un servicio'
);

select throws_ok(
  $$ insert into public.barbers (display_name) values ('Barbero de B') $$,
  '42501', null,
  'El barbero no crea barberos'
);

select throws_ok(
  $$ insert into public.barber_services (barber_id, service_id)
     values ('bbbbbbbb-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001') $$,
  '42501', null,
  'El barbero no se asigna servicios'
);

select throws_ok(
  $$ insert into public.portfolio_items (barber_id, image_path)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001/x.jpg') $$,
  '42501', null,
  'El barbero no escribe en el portafolio de otro'
);

select lives_ok(
  $$ insert into public.portfolio_items (barber_id, image_path)
     values ('bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001/x.jpg') $$,
  'El barbero agrega trabajos a su portafolio'
);

-- Porcentajes: ve el suyo y no lo cambia.
select results_eq(
  $$ select barber_id::text from public.commission_rates $$,
  $$ values ('bbbbbbbb-0000-0000-0000-000000000001') $$,
  'El barbero solo ve su porcentaje'
);

update public.commission_rates set barber_pct = 90 where barber_id = 'bbbbbbbb-0000-0000-0000-000000000001';
select results_eq(
  $$ select barber_pct from public.commission_rates $$,
  $$ values (40.00::numeric(5, 2)) $$,
  'El barbero no cambia su porcentaje'
);

-- Configuración de la agenda y de los recordatorios: solo el administrador.
update public.booking_settings set min_lead_min = 0;
select results_eq(
  $$ select min_lead_min from public.booking_settings $$,
  $$ values (60) $$,
  'El barbero no cambia la configuración de la agenda'
);

update public.notification_settings set send_confirmation = false;
select results_eq(
  $$ select send_confirmation from public.notification_settings $$,
  $$ values (true) $$,
  'El barbero no cambia la configuración de los recordatorios'
);

-- Horario y bloqueos: los suyos.
select throws_ok(
  $$ select public.create_time_off('aaaaaaaa-0000-0000-0000-000000000001',
       tests.at(4, '12:00'), tests.at(4, '13:00')) $$,
  'P0001', 'FORBIDDEN',
  'El barbero no bloquea la agenda de otro'
);

delete from public.time_off where barber_id = 'aaaaaaaa-0000-0000-0000-000000000001';
reset role;
select results_eq(
  $$ select count(*)::integer from public.time_off where barber_id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  $$ values (1) $$,
  'El barbero no borra los bloqueos de otro'
);

select tests.login('b0000000-0000-0000-0000-000000000001');
select is_empty(
  $$ select 1 from public.time_off where barber_id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  'El barbero no ve los bloqueos de otro'
);

-- Citas: solo en su agenda y con sus clientes.
select throws_ok(
  $$ select public.staff_create_appointment('c1000000-0000-0000-0000-000000000001',
       '5e000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
       tests.at(5, '10:00')) $$,
  'P0001', 'FORBIDDEN',
  'El barbero no crea citas en la agenda de otro'
);

select throws_ok(
  $$ select public.staff_create_appointment('c2000000-0000-0000-0000-000000000001',
       '5e000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001',
       tests.at(5, '10:00')) $$,
  'P0001', 'NOT_FOUND',
  'El barbero no agenda a un cliente que no es suyo'
);

-- Administración: inasistencias, cobros, liquidación ajena y roles.
select throws_ok(
  $$ select public.reset_no_shows('c1000000-0000-0000-0000-000000000001') $$,
  'P0001', 'FORBIDDEN',
  'El barbero no reinicia inasistencias'
);

select throws_ok(
  $$ select * from public.get_settlement(tests.day(-30), tests.day(0),
       'aaaaaaaa-0000-0000-0000-000000000001') $$,
  'P0001', 'FORBIDDEN',
  'El barbero no ve la liquidación de otro'
);

reset role;

select tests.login('b0000000-0000-0000-0000-000000000001');
delete from public.staff_roles where user_id = 'a0000000-0000-0000-0000-000000000001';
reset role;
select results_eq(
  $$ select count(*)::integer from public.staff_roles where user_id = 'a0000000-0000-0000-0000-000000000001' $$,
  $$ values (2) $$,
  'El borrado del barbero en staff_roles no afecta los roles del administrador'
);

-- El administrador sí puede todo lo anterior.
select tests.login('a0000000-0000-0000-0000-000000000001');

select lives_ok(
  $$ insert into public.services (name, duration_min, price_cop) values ('Barba', 30, 15000) $$,
  'El administrador crea servicios'
);

select lives_ok(
  $$ insert into public.barbers (display_name) values ('Barbero C') $$,
  'El administrador crea barberos'
);

select lives_ok(
  $$ insert into public.commission_rates (barber_id, barber_pct)
     select id, 45 from public.barbers where display_name = 'Barbero C' $$,
  'El administrador fija el porcentaje de un barbero'
);

update public.booking_settings set min_lead_min = 30;
select results_eq(
  $$ select min_lead_min from public.booking_settings $$,
  $$ values (30) $$,
  'El administrador cambia la configuración de la agenda'
);

update public.notification_settings set send_confirmation = false;
select results_eq(
  $$ select send_confirmation from public.notification_settings $$,
  $$ values (false) $$,
  'El administrador cambia la configuración de los recordatorios'
);

select lives_ok(
  $$ select public.create_time_off('bbbbbbbb-0000-0000-0000-000000000001',
       tests.at(4, '12:00'), tests.at(4, '13:00'), 'Puesto por el administrador') $$,
  'El administrador bloquea la agenda de otro barbero'
);

select lives_ok(
  $$ select public.staff_create_appointment('c2000000-0000-0000-0000-000000000001',
       '5e000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001',
       tests.at(5, '10:00')) $$,
  'El administrador agenda a cualquier cliente en cualquier agenda'
);

select lives_ok(
  $$ select public.reset_no_shows('c1000000-0000-0000-0000-000000000001') $$,
  'El administrador reinicia inasistencias'
);
reset role;

select * from finish();
rollback;
