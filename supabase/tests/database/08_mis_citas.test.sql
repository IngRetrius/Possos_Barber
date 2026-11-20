-- F5: "Mis citas" (list_my_appointments). Solo las citas del cliente de la sesión, con nombres
-- aunque el servicio o el barbero estén inactivos, el límite para cambiarlas según
-- cancel_window_min y el enlace a la cita que reemplazó a una reprogramada.
begin;
\ir ../fixtures/setup.psql
select plan(19);

-- Citas de cust1: una próxima (en 2 días) y una pasada atendida. Una de cust2.
insert into public.appointments (id, barber_id, customer_id, service_id, period, status, source, price_cop)
values
  ('f5000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001',
   tstzrange(tests.at(2, '10:00'), tests.at(2, '11:00'), '[)'), 'booked', 'customer', 30000),
  ('f5000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001',
   tstzrange(tests.at(-3, '10:00'), tests.at(-3, '11:00'), '[)'), 'completed', 'customer', 30000),
  ('f5000000-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001',
   'c2000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001',
   tstzrange(tests.at(2, '10:00'), tests.at(2, '11:00'), '[)'), 'booked', 'customer', 30000);

-- ---------------------------------------------------------------------------------------------
-- Quién puede llamarla
-- ---------------------------------------------------------------------------------------------
select tests.login_anon();
select throws_ok(
  $$ select * from public.list_my_appointments() $$,
  '42501', null,
  'Sin sesión no se puede llamar'
);
reset role;

select tests.login('c0000000-0000-0000-0000-000000000001');
select results_eq(
  $$ select id from public.list_my_appointments() $$,
  $$ values ('f5000000-0000-0000-0000-000000000001'::uuid),
            ('f5000000-0000-0000-0000-000000000002'::uuid) $$,
  'El cliente ve solo sus citas, la más nueva primero'
);
select is(
  (select count(*)::integer
   from public.list_my_appointments('f5000000-0000-0000-0000-000000000003')),
  0,
  'Con el id de una cita de otro cliente no devuelve nada'
);
select is(
  (select count(*)::integer from public.list_my_appointments(null, 1)),
  1,
  'Respeta el límite'
);
reset role;

select tests.login('c0000000-0000-0000-0000-000000000002');
select results_eq(
  $$ select id from public.list_my_appointments() $$,
  $$ values ('f5000000-0000-0000-0000-000000000003'::uuid) $$,
  'Otro cliente ve solo la suya'
);
reset role;

select tests.login('a0000000-0000-0000-0000-000000000001');
select is(
  (select count(*)::integer from public.list_my_appointments()),
  0,
  'El administrador sin perfil de cliente no recibe citas de nadie'
);
reset role;

select tests.login('d0000000-0000-0000-0000-000000000001');
select is(
  (select count(*)::integer from public.list_my_appointments()),
  0,
  'Un usuario sin perfil no recibe nada'
);
reset role;

-- ---------------------------------------------------------------------------------------------
-- Lo que devuelve
-- ---------------------------------------------------------------------------------------------
select tests.login('c0000000-0000-0000-0000-000000000001');
select results_eq(
  $$ select service_name, barber_name, price_cop, start_at, end_at
     from public.list_my_appointments('f5000000-0000-0000-0000-000000000001') $$,
  $$ values ('Servicio de prueba'::text, 'Barbero A'::text, 30000,
             tests.at(2, '10:00'), tests.at(2, '11:00')) $$,
  'Trae el servicio, el barbero, el precio, el inicio y el fin'
);
select is(
  (select change_deadline
   from public.list_my_appointments('f5000000-0000-0000-0000-000000000001')),
  tests.at(2, '10:00') - interval '120 minutes',
  'El límite para cambiarla es 2 h antes (cancel_window_min)'
);
reset role;

-- El límite sale de booking_settings, no de un número fijo.
update public.booking_settings set cancel_window_min = 30 where id;
select tests.login('c0000000-0000-0000-0000-000000000001');
select is(
  (select change_deadline
   from public.list_my_appointments('f5000000-0000-0000-0000-000000000001')),
  tests.at(2, '10:00') - interval '30 minutes',
  'Si el administrador cambia cancel_window_min, el límite cambia'
);
reset role;
update public.booking_settings set cancel_window_min = 120 where id;

-- Servicio y barbero inactivos: el cliente ya no puede leerlos en sus tablas, pero el historial
-- conserva los nombres. `reset role` no borra el JWT del último usuario: sin esto, el trigger de
-- barbers lo trataría como un cliente que intenta desactivar al barbero.
select set_config('request.jwt.claims', '{}', true);
update public.services set active = false where id = '5e000000-0000-0000-0000-000000000001';
update public.barbers set active = false, whatsapp_url = 'https://wa.me/573000000009'
where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select tests.login('c0000000-0000-0000-0000-000000000001');
select is(
  (select count(*)::integer from public.services where id = '5e000000-0000-0000-0000-000000000001'),
  0,
  'Por RLS el cliente no lee un servicio inactivo'
);
select results_eq(
  $$ select service_name, service_active, barber_name, barber_active, barber_whatsapp_url
     from public.list_my_appointments('f5000000-0000-0000-0000-000000000002') $$,
  $$ values ('Servicio de prueba'::text, false, 'Barbero A'::text, false,
             'https://wa.me/573000000009'::text) $$,
  'La función conserva los nombres, dice que están inactivos y trae el WhatsApp del barbero'
);
reset role;
select set_config('request.jwt.claims', '{}', true);
update public.services set active = true where id = '5e000000-0000-0000-0000-000000000001';
update public.barbers set active = true where id = 'aaaaaaaa-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------------------------------
-- Reprogramar
-- ---------------------------------------------------------------------------------------------
select tests.login('c0000000-0000-0000-0000-000000000001');
select lives_ok(
  $$ select public.reschedule_appointment('f5000000-0000-0000-0000-000000000001', tests.at(3, '15:00')) $$,
  'El cliente reprograma su cita'
);
select ok(
  not exists (select 1 from public.list_my_appointments()
              where id = 'f5000000-0000-0000-0000-000000000001'),
  'La lista no muestra la cita que se reprogramó'
);
select is(
  (select count(*)::integer from public.list_my_appointments()
   where status in ('pending_approval', 'booked', 'confirmed')),
  1,
  'Queda una sola cita activa'
);
select is(
  (select start_at from public.list_my_appointments()
   where status in ('pending_approval', 'booked', 'confirmed')),
  tests.at(3, '15:00'),
  'La cita activa es la de la hora nueva'
);
select is(
  (select replaced_by from public.list_my_appointments('f5000000-0000-0000-0000-000000000001')),
  (select id from public.appointments
   where rescheduled_from = 'f5000000-0000-0000-0000-000000000001'),
  'Con el id de la cita vieja, replaced_by lleva a la nueva'
);
select is(
  (select status from public.list_my_appointments('f5000000-0000-0000-0000-000000000001')),
  'cancelled'::public.appointment_status,
  'La cita vieja queda cancelada'
);
reset role;

-- Las citas de cust1 que ve cust2: ninguna, ni por el id de la nueva. El id se toma antes de
-- iniciar sesión: como cust2, RLS lo escondería y la función recibiría null (la lista completa).
select id as new_id from public.appointments
where rescheduled_from = 'f5000000-0000-0000-0000-000000000001' \gset
select tests.login('c0000000-0000-0000-0000-000000000002');
select is(
  (select count(*)::integer from public.list_my_appointments(:'new_id')),
  0,
  'Otro cliente no ve la cita reprogramada de nadie'
);
reset role;

select * from finish();
rollback;
