-- F4: lo que lee el flujo de reserva: horario público, días con horas libres y el estado del
-- cliente (si su reserva queda pendiente de aprobación).
begin;
\ir ../fixtures/setup.psql
select plan(17);

-- ---------------------------------------------------------------------------------------------
-- Horario de la barbería (get_opening_hours)
-- ---------------------------------------------------------------------------------------------
-- Rangos extra del lunes: uno que se cruza con el de 6:00 a 22:00 y otro aparte.
insert into public.working_hours (barber_id, weekday, start_time, end_time) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 1, '05:00', '06:30'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 1, '22:30', '23:00');

select tests.login_anon();

select is(
  (select count(*)::integer from public.get_opening_hours()),
  8,
  'Sin sesión se lee el horario: un rango por día y dos el lunes'
);

select results_eq(
  $$ select start_time, end_time from public.get_opening_hours() where weekday = 1 $$,
  $$ values ('05:00'::time, '22:00'::time), ('22:30'::time, '23:00'::time) $$,
  'Los rangos que se cruzan se juntan; los separados quedan aparte'
);

select results_eq(
  $$ select start_time, end_time from public.get_opening_hours() where weekday = 3 $$,
  $$ values ('06:00'::time, '22:00'::time) $$,
  'Dos barberos con el mismo horario dan un solo rango'
);
reset role;

-- Un barbero inactivo no cuenta.
insert into public.working_hours (barber_id, weekday, start_time, end_time) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 2, '23:00', '23:30');
update public.barbers set active = false where id = 'bbbbbbbb-0000-0000-0000-000000000001';

select tests.login_anon();
select is(
  (select count(*)::integer from public.get_opening_hours() where weekday = 2),
  1,
  'El horario de un barbero inactivo no aparece'
);
reset role;
update public.barbers set active = true where id = 'bbbbbbbb-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------------------------------
-- Días con horas libres (get_available_days)
-- ---------------------------------------------------------------------------------------------
-- anon no lee booking_settings: el tamaño de la ventana se toma antes.
select max_days_ahead + 1 as window_days from public.booking_settings where id \gset
select tests.login_anon();

select is(
  (select count(*)::integer from public.get_available_days('5e000000-0000-0000-0000-000000000001')),
  :window_days,
  'Sin sesión se leen todos los días de la ventana de reserva, hoy incluido'
);

select is(
  (select min(day) from public.get_available_days('5e000000-0000-0000-0000-000000000001')),
  tests.day(0),
  'El primer día es hoy (hora de Bogotá)'
);

select is(
  (select slots from public.get_available_days('5e000000-0000-0000-0000-000000000001',
                                               'aaaaaaaa-0000-0000-0000-000000000001')
   where day = tests.day(2)),
  (select count(*)::integer from public.get_available_slots('5e000000-0000-0000-0000-000000000001',
                                                             tests.day(2),
                                                             'aaaaaaaa-0000-0000-0000-000000000001')),
  'Cada día cuenta las mismas horas que get_available_slots'
);

select is(
  (select slots from public.get_available_days('5e000000-0000-0000-0000-000000000001',
                                               'aaaaaaaa-0000-0000-0000-000000000001')
   where day = tests.day(2)),
  16,
  'Con el horario de prueba (6:00 a 22:00) hay 16 horas de 60 min'
);
reset role;

-- Una reserva quita una hora al barbero, pero no a "cualquiera" mientras otro siga libre.
select tests.login('c0000000-0000-0000-0000-000000000001');
select lives_ok(
  $$ select public.book_appointment('5e000000-0000-0000-0000-000000000001', tests.at(2, '10:00'),
                                    'aaaaaaaa-0000-0000-0000-000000000001') $$,
  'El cliente reserva con el barbero A'
);
reset role;

select tests.login_anon();
select is(
  (select slots from public.get_available_days('5e000000-0000-0000-0000-000000000001',
                                               'aaaaaaaa-0000-0000-0000-000000000001')
   where day = tests.day(2)),
  15,
  'El barbero A tiene una hora menos ese día'
);

select is(
  (select slots from public.get_available_days('5e000000-0000-0000-0000-000000000001')
   where day = tests.day(2)),
  16,
  'Con "cualquiera disponible" la hora sigue libre porque B está libre'
);

select is(
  (select slots from public.get_available_days('5e000000-0000-0000-0000-000000000001')
   where day = tests.day(-1)),
  null,
  'Los días pasados no aparecen'
);
reset role;

-- ---------------------------------------------------------------------------------------------
-- Aviso de aprobación (my_booking_requires_approval)
-- ---------------------------------------------------------------------------------------------
insert into public.customer_booking_status (customer_id, no_show_count, requires_approval) values
  ('c1000000-0000-0000-0000-000000000001', 1, false),
  ('c2000000-0000-0000-0000-000000000001', 2, true);

select tests.login('c0000000-0000-0000-0000-000000000002');
select is(public.my_booking_requires_approval(), true,
  'El cliente con 2 inasistencias sabe que su reserva queda pendiente');
select is_empty($$ select 1 from public.customer_booking_status $$,
  'Pero sigue sin ver su contador de inasistencias (docs/06)');
reset role;

select tests.login('c0000000-0000-0000-0000-000000000001');
select is(public.my_booking_requires_approval(), false,
  'El cliente con una inasistencia reserva sin aprobación');
reset role;

select tests.login('d0000000-0000-0000-0000-000000000001');
select is(public.my_booking_requires_approval(), false,
  'Un usuario sin perfil recibe false, sin error');
reset role;

select tests.login_anon();
select throws_ok(
  $$ select public.my_booking_requires_approval() $$,
  '42501', null,
  'Sin sesión no se puede llamar'
);
reset role;

select * from finish();
rollback;
