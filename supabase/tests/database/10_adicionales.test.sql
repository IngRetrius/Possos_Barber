-- Adicionales de un servicio (barba, cejas, diseño; 20/11/2026): suman precio y minutos a la cita,
-- la restricción de exclusión cubre el tiempo completo, y nadie ve los de las citas de otro.
begin;
\ir ../fixtures/setup.psql
select plan(19);

-- Barba: 60 min y 15.000. Cejas: 0 min y 5.000. Viejo: inactivo. Ajeno: de otro servicio.
-- Pendiente: sin precio ([PENDIENTE]).
insert into public.services (id, name, duration_min, price_cop) values
  ('5e000000-0000-0000-0000-000000000002', 'Otro servicio', 60, 20000);

insert into public.service_addons (id, service_id, name, price_cop, duration_min, active, sort_order) values
  ('ad000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001', 'Barba', 15000, 60, true, 1),
  ('ad000000-0000-0000-0000-000000000002', '5e000000-0000-0000-0000-000000000001', 'Cejas', 5000, 0, true, 2),
  ('ad000000-0000-0000-0000-000000000003', '5e000000-0000-0000-0000-000000000001', 'Viejo', 1000, 0, false, 3),
  ('ad000000-0000-0000-0000-000000000004', '5e000000-0000-0000-0000-000000000002', 'Ajeno', 1000, 0, true, 1),
  ('ad000000-0000-0000-0000-000000000005', '5e000000-0000-0000-0000-000000000001', 'Pendiente', null, 0, true, 4);

-- ---------------------------------------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------------------------------------
select tests.login_anon();
select results_eq(
  $$ select name from public.service_addons
     where service_id = '5e000000-0000-0000-0000-000000000001' order by sort_order $$,
  $$ values ('Barba'), ('Cejas'), ('Pendiente') $$,
  'Sin sesión se ven los adicionales activos, no los inactivos'
);
select throws_ok(
  $$ insert into public.service_addons (service_id, name, duration_min)
     values ('5e000000-0000-0000-0000-000000000001', 'Nuevo', 0) $$,
  '42501', null,
  'Sin sesión no se crean adicionales'
);
reset role;

select tests.login('b0000000-0000-0000-0000-000000000001');
select is(
  (select count(*)::integer from public.service_addons
   where service_id = '5e000000-0000-0000-0000-000000000001'),
  4,
  'El personal ve también los inactivos, para no perder nombres en la agenda'
);
select is_empty(
  $$ update public.service_addons set price_cop = 0 returning id $$,
  'Un barbero sin rol de administrador no cambia adicionales'
);
reset role;

select tests.login('a0000000-0000-0000-0000-000000000001');
select lives_ok(
  $$ update public.service_addons set sort_order = 1
     where id = 'ad000000-0000-0000-0000-000000000001' $$,
  'El administrador cambia adicionales'
);
reset role;

-- ---------------------------------------------------------------------------------------------
-- Disponibilidad: la barba alarga la cita una hora (horario de prueba: 6:00 a 22:00)
-- ---------------------------------------------------------------------------------------------
select tests.login_anon();
select is(
  (select max(start_at) from public.get_available_slots(
     '5e000000-0000-0000-0000-000000000001', tests.day(2), 'aaaaaaaa-0000-0000-0000-000000000001')),
  tests.at(2, '21:00'),
  'Sin adicionales, la última hora del día es a las 21:00'
);
select is(
  (select max(start_at) from public.get_available_slots(
     '5e000000-0000-0000-0000-000000000001', tests.day(2), 'aaaaaaaa-0000-0000-0000-000000000001',
     array['ad000000-0000-0000-0000-000000000001']::uuid[])),
  tests.at(2, '20:00'),
  'Con barba (2 h), la última hora del día es a las 20:00'
);
select is_empty(
  $$ select 1 from public.get_available_slots(
       '5e000000-0000-0000-0000-000000000001', tests.day(2), null,
       array['ad000000-0000-0000-0000-000000000004']::uuid[]) $$,
  'Un adicional de otro servicio no da horas'
);
reset role;

-- ---------------------------------------------------------------------------------------------
-- Reservar con adicionales
-- ---------------------------------------------------------------------------------------------
select tests.login('c0000000-0000-0000-0000-000000000001');

select book_id from (
  select (public.book_appointment(
    '5e000000-0000-0000-0000-000000000001', tests.at(2, '10:00'),
    'aaaaaaaa-0000-0000-0000-000000000001',
    -- Cejas repetida: cuenta una vez.
    array['ad000000-0000-0000-0000-000000000001', 'ad000000-0000-0000-0000-000000000002',
          'ad000000-0000-0000-0000-000000000002']::uuid[])).id as book_id
) x \gset

select results_eq(
  format($$ select upper(period) - lower(period), price_cop from public.appointments where id = %L $$,
         :'book_id'),
  $$ values ('2 hours'::interval, 50000) $$,
  'Corte con barba y cejas: 2 h y 30.000 + 15.000 + 5.000'
);
select results_eq(
  format($$ select addon_names from public.list_my_appointments(%L) $$, :'book_id'),
  $$ values (array['Barba', 'Cejas']) $$,
  'Mis citas trae los adicionales en su orden, sin repetir'
);
select throws_ok(
  $$ select public.book_appointment('5e000000-0000-0000-0000-000000000001', tests.at(3, '10:00'),
       'aaaaaaaa-0000-0000-0000-000000000001', array['ad000000-0000-0000-0000-000000000003']::uuid[]) $$,
  'P0001', 'SERVICE_NOT_AVAILABLE',
  'Un adicional inactivo no se reserva'
);
select throws_ok(
  $$ select public.book_appointment('5e000000-0000-0000-0000-000000000001', tests.at(3, '10:00'),
       'aaaaaaaa-0000-0000-0000-000000000001', array['ad000000-0000-0000-0000-000000000004']::uuid[]) $$,
  'P0001', 'SERVICE_NOT_AVAILABLE',
  'Un adicional de otro servicio no se reserva'
);
select is(
  (public.book_appointment('5e000000-0000-0000-0000-000000000001', tests.at(4, '10:00'),
     'aaaaaaaa-0000-0000-0000-000000000001',
     array['ad000000-0000-0000-0000-000000000005']::uuid[])).price_cop,
  null,
  'Con un adicional sin precio, el total queda [PENDIENTE]'
);
reset role;

-- La regla 3 cubre el tiempo de la barba: de 10:00 a 12:00 el barbero A está ocupado.
select tests.login('c0000000-0000-0000-0000-000000000002');
select throws_ok(
  $$ select public.book_appointment('5e000000-0000-0000-0000-000000000001', tests.at(2, '11:00'),
       'aaaaaaaa-0000-0000-0000-000000000001') $$,
  'P0001', 'SLOT_TAKEN',
  'La hora de la barba queda ocupada para otro cliente'
);
select is_empty(
  format($$ select 1 from public.appointment_addons where appointment_id = %L $$, :'book_id'),
  'Otro cliente no ve los adicionales de la cita ajena'
);
reset role;

select throws_ok(
  format($$ insert into public.appointments (barber_id, customer_id, service_id, period, source)
            values ('aaaaaaaa-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001',
                    '5e000000-0000-0000-0000-000000000001',
                    tstzrange(%L, %L, '[)'), 'staff') $$,
         tests.at(2, '11:00'), tests.at(2, '12:00')),
  '23P01', null,
  'La restricción de exclusión rechaza una cita encima de la segunda hora'
);

-- ---------------------------------------------------------------------------------------------
-- Reprogramar, citas del personal y avisos
-- ---------------------------------------------------------------------------------------------
select tests.login('c0000000-0000-0000-0000-000000000001');
select new_id from (
  select (public.reschedule_appointment(:'book_id', tests.at(5, '10:00'))).id as new_id
) x \gset
select results_eq(
  format($$ select upper(a.period) - lower(a.period),
            (select count(*)::integer from public.appointment_addons aa where aa.appointment_id = a.id)
     from public.appointments a where a.id = %L $$, :'new_id'),
  $$ values ('2 hours'::interval, 2) $$,
  'Al cambiar la hora, la cita sigue con sus adicionales y sus 2 h'
);
reset role;

select tests.login('a0000000-0000-0000-0000-000000000001');
select is(
  (select upper(period) - lower(period) from public.staff_create_appointment(
     'c3000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001',
     'aaaaaaaa-0000-0000-0000-000000000001', tests.at(6, '10:00'),
     array['ad000000-0000-0000-0000-000000000001']::uuid[])),
  '2 hours'::interval,
  'El personal también agenda con adicionales'
);
reset role;

select tests.login_service();
select is(
  (select service_name from public.get_appointment_for_notification(:'new_id')),
  'Servicio de prueba + Barba + Cejas',
  'El aviso nombra el servicio con sus adicionales'
);
reset role;

select * from finish();
rollback;
