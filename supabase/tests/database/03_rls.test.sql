-- RLS por rol (matriz de docs/06) y pruebas obligatorias 5 y 6 de docs/09.
begin;
\ir ../fixtures/setup.psql
select plan(46);

-- Datos: cliente 1 con A, cliente 2 con B, notas de cada barbero, un trabajo de mensaje.
insert into public.appointments (id, barber_id, customer_id, service_id, period, source) values
  ('ad000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001',
   tstzrange(tests.at(2, '10:00'), tests.at(2, '11:00'), '[)'), 'customer'),
  ('ad000000-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001',
   'c2000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001',
   tstzrange(tests.at(2, '11:00'), tests.at(2, '12:00'), '[)'), 'customer');
select public.link_customer_to_barber('c1000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001');
select public.link_customer_to_barber('c2000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001');
insert into public.customer_notes (customer_id, barber_id, body) values
  ('c1000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Nota de A'),
  ('c2000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Nota de B');
insert into public.customer_booking_status (customer_id, no_show_count) values
  ('c1000000-0000-0000-0000-000000000001', 1);
insert into public.message_jobs (appointment_id, kind, offset_min, channel, send_at) values
  ('ad000000-0000-0000-0000-000000000001', 'reminder', 1440, 'whatsapp', tests.at(1, '10:00'));

-- ---------------------------------------------------------------------------------------------
-- Cliente
-- ---------------------------------------------------------------------------------------------
select tests.login('c0000000-0000-0000-0000-000000000001');

select results_eq(
  $$ select id from public.customers $$,
  $$ values ('c1000000-0000-0000-0000-000000000001'::uuid) $$,
  '5. El cliente solo ve su propio registro de cliente'
);
select results_eq(
  $$ select id from public.appointments $$,
  $$ values ('ad000000-0000-0000-0000-000000000001'::uuid) $$,
  '5. El cliente solo ve sus citas'
);
select is_empty($$ select 1 from public.barber_customers $$, 'El cliente no ve barber_customers');
select is_empty($$ select 1 from public.customer_notes $$, 'El cliente no ve notas del barbero');
select is_empty($$ select 1 from public.customer_booking_status $$, 'El cliente no ve su contador de inasistencias');
select is_empty($$ select 1 from public.staff_roles $$, 'El cliente no tiene roles');
select is_empty($$ select 1 from public.working_hours $$, 'El cliente no ve horarios por tabla');
select is_empty($$ select 1 from public.commission_rates $$, 'El cliente no ve porcentajes');
select is_empty($$ select 1 from public.charges $$, 'El cliente no ve cobros');
select is_empty($$ select 1 from public.message_jobs $$, 'El cliente no ve el registro de mensajes');
select throws_ok($$ select 1 from public.booking_events $$, '42501', null, 'El cliente no lee booking_events');
select isnt_empty($$ select 1 from public.services $$, 'El cliente ve los servicios activos');
select isnt_empty($$ select 1 from public.barbers $$, 'El cliente ve los barberos activos');
select throws_ok(
  $$ insert into public.staff_roles (user_id, role) values ('c0000000-0000-0000-0000-000000000001', 'admin') $$,
  '42501', null,
  'El cliente no se asigna un rol'
);
select lives_ok(
  $$ update public.customers set full_name = 'Cliente Uno Editado' where id = 'c1000000-0000-0000-0000-000000000001' $$,
  'El cliente edita su perfil'
);
select throws_ok(
  $$ update public.customers set user_id = null where id = 'c1000000-0000-0000-0000-000000000001' $$,
  '42501', null,
  'El cliente no cambia el user_id de su perfil'
);
update public.customers set full_name = 'Pirata' where id = 'c2000000-0000-0000-0000-000000000001';
reset role;
select is(
  (select full_name from public.customers where id = 'c2000000-0000-0000-0000-000000000001'),
  'Cliente Dos',
  'El cliente no edita el perfil de otro'
);

-- Un usuario sin rol tampoco se asigna uno, y no guarda perfil sin autorización de datos.
select tests.login('d0000000-0000-0000-0000-000000000001');
select throws_ok(
  $$ insert into public.staff_roles (user_id, role) values ('d0000000-0000-0000-0000-000000000001', 'barber') $$,
  '42501', null,
  'Un usuario sin rol no puede insertarse en staff_roles'
);
select throws_ok(
  $$ insert into public.customers (user_id, full_name, phone)
     values ('d0000000-0000-0000-0000-000000000001', 'Sin Permiso', '+573000000009') $$,
  '23514', null,
  'Sin autorización de tratamiento de datos no se guarda el perfil'
);
select throws_ok(
  $$ insert into public.customers (user_id, full_name, phone, data_consent_at, data_policy_version)
     values ('c0000000-0000-0000-0000-000000000002', 'Suplantador', '+573000000009', now(), 'v1') $$,
  '42501', null,
  'Nadie crea un perfil a nombre de otro usuario'
);
select lives_ok(
  $$ insert into public.customers (user_id, full_name, phone, data_consent_at, data_policy_version)
     values ('d0000000-0000-0000-0000-000000000001', 'Nuevo Cliente', '+573000000009', now(), 'v1') $$,
  'Con la autorización, el usuario crea su perfil'
);
reset role;

-- ---------------------------------------------------------------------------------------------
-- Barbero B (sin admin)
-- ---------------------------------------------------------------------------------------------
select tests.login('b0000000-0000-0000-0000-000000000001');

select is_empty(
  $$ select 1 from public.customers where id = 'c1000000-0000-0000-0000-000000000001' $$,
  '6. El barbero no ve a un cliente sin barber_customers con él'
);
select isnt_empty(
  $$ select 1 from public.customers where id = 'c2000000-0000-0000-0000-000000000001' $$,
  'El barbero ve a su cliente'
);
select results_eq(
  $$ select id from public.appointments $$,
  $$ values ('ad000000-0000-0000-0000-000000000002'::uuid) $$,
  'El barbero solo ve las citas de su agenda'
);
select results_eq(
  $$ select body from public.customer_notes $$,
  $$ values ('Nota de B') $$,
  'El barbero solo ve sus notas'
);
select is_empty($$ select 1 from public.customer_booking_status $$, 'El barbero no ve el contador de clientes ajenos');
select ok(
  (select bool_and(barber_id = 'bbbbbbbb-0000-0000-0000-000000000001') from public.working_hours),
  'El barbero solo ve su horario'
);
select results_eq(
  $$ select role::text from public.staff_roles $$,
  $$ values ('barber') $$,
  'El barbero solo ve sus roles'
);
select is_empty($$ select 1 from public.message_jobs $$, 'El barbero no ve mensajes de citas ajenas');
select throws_ok(
  $$ insert into public.customer_notes (customer_id, barber_id, body)
     values ('c1000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Intruso') $$,
  '42501', null,
  'El barbero no escribe notas de clientes que no son suyos'
);
select lives_ok(
  $$ update public.barbers set bio = 'Bio de B' where id = 'bbbbbbbb-0000-0000-0000-000000000001' $$,
  'El barbero edita su perfil'
);
select throws_ok(
  $$ update public.barbers set active = false where id = 'bbbbbbbb-0000-0000-0000-000000000001' $$,
  'P0001', 'FORBIDDEN',
  'El barbero no se desactiva ni cambia campos del administrador'
);
update public.barbers set bio = 'Pirata' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select throws_ok(
  $$ insert into public.staff_roles (user_id, role) values ('b0000000-0000-0000-0000-000000000001', 'admin') $$,
  '42501', null,
  'El barbero no se asigna el rol de administrador'
);
select lives_ok(
  $$ select public.staff_create_customer('Cliente Nuevo de B', '+573000000010') $$,
  'El barbero crea un cliente sin cuenta'
);
select isnt_empty(
  $$ select 1 from public.customers where full_name = 'Cliente Nuevo de B' $$,
  '... y lo ve porque queda enlazado con él'
);
reset role;
select is(
  (select bio from public.barbers where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  null,
  'El barbero no edita el perfil de otro barbero'
);

-- ---------------------------------------------------------------------------------------------
-- Administrador (dueño, también barbero A)
-- ---------------------------------------------------------------------------------------------
select tests.login('a0000000-0000-0000-0000-000000000001');

select ok(
  (select count(*) = 3 from public.customers
   where id in ('c1000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001',
                'c3000000-0000-0000-0000-000000000001')),
  'El administrador ve a todos los clientes'
);
select ok(
  (select count(*) = 2 from public.appointments
   where id in ('ad000000-0000-0000-0000-000000000001', 'ad000000-0000-0000-0000-000000000002')),
  'El administrador ve las citas de todas las agendas'
);
select ok(
  (select count(*) = 2 from public.customer_notes where body in ('Nota de A', 'Nota de B')),
  'El administrador ve todas las notas'
);
select isnt_empty($$ select 1 from public.customer_booking_status $$, 'El administrador ve los contadores');
select isnt_empty($$ select 1 from public.message_jobs $$, 'El administrador ve el registro de mensajes');
select lives_ok(
  $$ insert into public.staff_roles (user_id, role) values ('d0000000-0000-0000-0000-000000000001', 'barber') $$,
  'El administrador asigna roles'
);
reset role;

-- ---------------------------------------------------------------------------------------------
-- Sin sesión (anon)
-- ---------------------------------------------------------------------------------------------
select tests.login_anon();
select throws_ok($$ select 1 from public.customers $$, '42501', null, 'anon no lee clientes');
select throws_ok($$ select 1 from public.appointments $$, '42501', null, 'anon no lee citas');
select isnt_empty($$ select 1 from public.services $$, 'anon ve los servicios activos');
select isnt_empty($$ select 1 from public.barbers $$, 'anon ve los barberos activos');
reset role;

select * from finish();
rollback;
