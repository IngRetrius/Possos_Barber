-- Reglas de la agenda (docs/04 y pruebas obligatorias 1 a 4, 7 y 8 de docs/09).
begin;
\ir ../fixtures/setup.psql
select plan(55);

-- Atajos: servicio y barberos del fixture.
-- S = 5e000000-0000-0000-0000-000000000001, A = aaaaaaaa-...-01, B = bbbbbbbb-...-01

-- ---------------------------------------------------------------------------------------------
-- 1. Dos reservas a la misma hora con el mismo barbero: una pasa, la otra SLOT_TAKEN.
-- ---------------------------------------------------------------------------------------------
select tests.login('c0000000-0000-0000-0000-000000000001');
select lives_ok(
  $$ select public.book_appointment('5e000000-0000-0000-0000-000000000001', tests.at(2, '10:00'),
                                    'aaaaaaaa-0000-0000-0000-000000000001') $$,
  '1. El cliente 1 reserva con A a las 10:00'
);
reset role;
select tests.login('c0000000-0000-0000-0000-000000000002');
select throws_ok(
  $$ select public.book_appointment('5e000000-0000-0000-0000-000000000001', tests.at(2, '10:00'),
                                    'aaaaaaaa-0000-0000-0000-000000000001') $$,
  'P0001', 'SLOT_TAKEN',
  '1. El cliente 2 no puede reservar la misma hora con A'
);
reset role;

-- La restricción manda aunque se inserte directo, sin funciones (regla 3).
select throws_ok(
  $$ insert into public.appointments (barber_id, customer_id, service_id, period, source)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001',
             '5e000000-0000-0000-0000-000000000001',
             tstzrange(tests.at(2, '10:30'), tests.at(2, '11:30'), '[)'), 'staff') $$,
  '23P01', null,
  'Un insert directo que se cruza viola no_double_booking'
);

-- ---------------------------------------------------------------------------------------------
-- 2. Una cita cancelada libera la hora.
-- ---------------------------------------------------------------------------------------------
select tests.login('c0000000-0000-0000-0000-000000000001');
select lives_ok(
  $$ select public.cancel_appointment(
       (select id from public.appointments
        where customer_id = 'c1000000-0000-0000-0000-000000000001'
          and lower(period) = tests.at(2, '10:00')), null) $$,
  '2. El cliente 1 cancela con más de 2 h de anticipación'
);
reset role;
select tests.login('c0000000-0000-0000-0000-000000000002');
select lives_ok(
  $$ select public.book_appointment('5e000000-0000-0000-0000-000000000001', tests.at(2, '10:00'),
                                    'aaaaaaaa-0000-0000-0000-000000000001') $$,
  '2. La hora liberada se puede reservar'
);
reset role;

-- ---------------------------------------------------------------------------------------------
-- 3. Citas seguidas no chocan.
-- ---------------------------------------------------------------------------------------------
select tests.login('c0000000-0000-0000-0000-000000000001');
select lives_ok(
  $$ select public.book_appointment('5e000000-0000-0000-0000-000000000001', tests.at(2, '15:00'),
                                    'aaaaaaaa-0000-0000-0000-000000000001') $$,
  '3. Cita de 15:00 a 16:00'
);
select lives_ok(
  $$ select public.book_appointment('5e000000-0000-0000-0000-000000000001', tests.at(2, '16:00'),
                                    'aaaaaaaa-0000-0000-0000-000000000001') $$,
  '3. Cita de 16:00 a 17:00 justo después'
);
reset role;

-- ---------------------------------------------------------------------------------------------
-- 4. No se puede reservar dentro de un bloqueo.
-- ---------------------------------------------------------------------------------------------
select tests.login('a0000000-0000-0000-0000-000000000001');
select lives_ok(
  $$ select public.create_time_off('aaaaaaaa-0000-0000-0000-000000000001',
                                   tests.at(3, '12:00'), tests.at(3, '14:00'), 'Diligencia') $$,
  '4. El barbero A bloquea de 12:00 a 14:00'
);
reset role;
select tests.login('c0000000-0000-0000-0000-000000000001');
select throws_ok(
  $$ select public.book_appointment('5e000000-0000-0000-0000-000000000001', tests.at(3, '12:00'),
                                    'aaaaaaaa-0000-0000-0000-000000000001') $$,
  'P0001', 'IN_TIME_OFF',
  '4. Reservar dentro del bloqueo devuelve IN_TIME_OFF'
);
select is_empty(
  $$ select 1 from public.get_available_slots('5e000000-0000-0000-0000-000000000001', tests.day(3),
                                              'aaaaaaaa-0000-0000-0000-000000000001')
     where start_at in (tests.at(3, '12:00'), tests.at(3, '13:00')) $$,
  '4. Las horas del bloqueo no aparecen como libres'
);
reset role;
select throws_ok(
  $$ insert into public.appointments (barber_id, customer_id, service_id, period, source)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001',
             '5e000000-0000-0000-0000-000000000001',
             tstzrange(tests.at(3, '13:00'), tests.at(3, '14:00'), '[)'), 'staff') $$,
  'P0001', 'IN_TIME_OFF',
  '4. El trigger impide la cita aunque se inserte directo'
);

-- Un bloqueo encima de citas existentes sí se crea y la lista de esas citas sale de
-- list_conflicting_appointments.
select tests.login('a0000000-0000-0000-0000-000000000001');
select lives_ok(
  $$ select public.create_time_off('aaaaaaaa-0000-0000-0000-000000000001',
                                   tests.at(2, '15:00'), tests.at(2, '15:30'), null) $$,
  'Un bloqueo puede caer encima de una cita existente'
);
select results_eq(
  $$ select customer_id from public.list_conflicting_appointments(
       'aaaaaaaa-0000-0000-0000-000000000001', tests.at(2, '15:00'), tests.at(2, '15:30')) $$,
  $$ values ('c1000000-0000-0000-0000-000000000001'::uuid) $$,
  'list_conflicting_appointments devuelve la cita que quedó debajo del bloqueo'
);
select throws_ok(
  $$ select public.create_time_off('aaaaaaaa-0000-0000-0000-000000000001',
                                   tests.at(3, '13:00'), tests.at(3, '15:00'), null) $$,
  'P0001', 'TIME_OFF_OVERLAP',
  'Dos bloqueos del mismo barbero no se cruzan'
);
reset role;
select tests.login('b0000000-0000-0000-0000-000000000001');
select throws_ok(
  $$ select public.create_time_off('aaaaaaaa-0000-0000-0000-000000000001',
                                   tests.at(5, '08:00'), tests.at(5, '09:00'), null) $$,
  'P0001', 'FORBIDDEN',
  'El barbero B no puede bloquear la agenda de A'
);
select throws_ok(
  $$ select * from public.list_conflicting_appointments(
       'aaaaaaaa-0000-0000-0000-000000000001', tests.at(2, '00:00'), tests.at(3, '00:00')) $$,
  'P0001', 'FORBIDDEN',
  'El barbero B no puede listar citas de A'
);
reset role;

-- ---------------------------------------------------------------------------------------------
-- Reglas de anticipación y horario para el cliente.
-- ---------------------------------------------------------------------------------------------
select tests.login('c0000000-0000-0000-0000-000000000001');
select throws_ok(
  $$ select public.book_appointment('5e000000-0000-0000-0000-000000000001', now() + interval '30 minutes',
                                    'aaaaaaaa-0000-0000-0000-000000000001') $$,
  'P0001', 'TOO_SOON',
  'Menos de 60 min de anticipación devuelve TOO_SOON'
);
select throws_ok(
  $$ select public.book_appointment('5e000000-0000-0000-0000-000000000001', tests.at(31, '10:00'),
                                    'aaaaaaaa-0000-0000-0000-000000000001') $$,
  'P0001', 'TOO_FAR',
  'Más de 30 días devuelve TOO_FAR'
);
select throws_ok(
  $$ select public.book_appointment('5e000000-0000-0000-0000-000000000001', tests.at(2, '22:00'),
                                    'aaaaaaaa-0000-0000-0000-000000000001') $$,
  'P0001', 'OUTSIDE_WORKING_HOURS',
  'Fuera del horario devuelve OUTSIDE_WORKING_HOURS'
);
select throws_ok(
  $$ select public.book_appointment('5e000000-0000-0000-0000-000000000001', tests.at(2, '11:30'),
                                    'aaaaaaaa-0000-0000-0000-000000000001') $$,
  'P0001', 'OUTSIDE_WORKING_HOURS',
  'Una hora que no está alineada al intervalo no se acepta'
);
reset role;
select tests.login('d0000000-0000-0000-0000-000000000001');
select throws_ok(
  $$ select public.book_appointment('5e000000-0000-0000-0000-000000000001', tests.at(2, '12:00'),
                                    'aaaaaaaa-0000-0000-0000-000000000001') $$,
  'P0001', 'NO_CUSTOMER_PROFILE',
  'Sin perfil de cliente no se reserva'
);
reset role;

-- get_available_slots: anon responde, solo horas, y respeta anticipación y máximo de días.
select tests.login_anon();
select is(
  pg_get_function_result('public.get_available_slots(uuid, date, uuid, uuid[])'::regprocedure),
  'TABLE(start_at timestamp with time zone, barber_ids uuid[])',
  'get_available_slots solo devuelve horas de inicio y barberos libres'
);
select isnt_empty(
  $$ select 1 from public.get_available_slots('5e000000-0000-0000-0000-000000000001', tests.day(30)) $$,
  'anon ve horas libres a 30 días'
);
select is_empty(
  $$ select 1 from public.get_available_slots('5e000000-0000-0000-0000-000000000001', tests.day(31)) $$,
  'No hay horas después de max_days_ahead'
);
select is_empty(
  $$ select 1 from public.get_available_slots('5e000000-0000-0000-0000-000000000001', tests.day(0))
     where start_at < now() + interval '60 minutes' $$,
  'No hay horas antes de min_lead_min'
);
select is_empty(
  $$ select 1 from public.get_available_slots('5e000000-0000-0000-0000-000000000001', tests.day(2),
                                              'aaaaaaaa-0000-0000-0000-000000000001')
     where start_at = tests.at(2, '10:00') $$,
  'Una hora ocupada no aparece como libre'
);
reset role;

-- ---------------------------------------------------------------------------------------------
-- Cualquiera disponible: el barbero libre con menos citas ese día; si empatan, rotación.
-- ---------------------------------------------------------------------------------------------
select tests.login('c0000000-0000-0000-0000-000000000001');
select is(
  (select barber_id from public.book_appointment('5e000000-0000-0000-0000-000000000001',
                                                 tests.at(2, '10:00'))),
  'bbbbbbbb-0000-0000-0000-000000000001'::uuid,
  'Cualquiera disponible: A está ocupado a las 10:00, toca B'
);
select is(
  (select barber_id from public.book_appointment('5e000000-0000-0000-0000-000000000001',
                                                 tests.at(6, '11:00'))),
  'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
  'Cualquiera disponible: empate en citas del día, toca quien no ha recibido asignación'
);
reset role;
select ok(
  (select bool_and(auto_assigned) from public.appointments
   where customer_id = 'c1000000-0000-0000-0000-000000000001'
     and lower(period) in (tests.at(2, '10:00'), tests.at(6, '11:00'))
     and status <> 'cancelled'),
  'Las asignaciones automáticas quedan marcadas con auto_assigned'
);

-- ---------------------------------------------------------------------------------------------
-- Reprogramar.
-- ---------------------------------------------------------------------------------------------
select tests.login('c0000000-0000-0000-0000-000000000001');
select throws_ok(
  $$ select public.reschedule_appointment(
       (select id from public.appointments
        where customer_id = 'c1000000-0000-0000-0000-000000000001'
          and lower(period) = tests.at(2, '16:00') and status = 'booked'),
       tests.at(2, '10:00')) $$,
  'P0001', 'SLOT_TAKEN',
  'Reprogramar a una hora ocupada falla'
);
select is(
  (select status::text from public.appointments
   where customer_id = 'c1000000-0000-0000-0000-000000000001'
     and lower(period) = tests.at(2, '16:00')
     and barber_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'booked',
  '... y no toca la cita original'
);
select lives_ok(
  $$ select public.reschedule_appointment(
       (select id from public.appointments
        where customer_id = 'c1000000-0000-0000-0000-000000000001'
          and lower(period) = tests.at(2, '16:00') and status = 'booked'),
       tests.at(2, '18:00')) $$,
  'Reprogramar a una hora libre funciona'
);
reset role;
select is(
  (select old.status::text from public.appointments new
   join public.appointments old on old.id = new.rescheduled_from
   where new.customer_id = 'c1000000-0000-0000-0000-000000000001'
     and lower(new.period) = tests.at(2, '18:00')),
  'cancelled',
  'La cita anterior queda cancelada y enlazada con rescheduled_from'
);
select results_eq(
  $$ select e.type from public.booking_events e
     join public.appointments a on a.id = e.appointment_id
     where a.customer_id = 'c1000000-0000-0000-0000-000000000001'
       and lower(a.period) in (tests.at(2, '16:00'), tests.at(2, '18:00'))
     order by e.id $$,
  $$ values ('appointment.created'), ('appointment.rescheduled') $$,
  'Reprogramar publica appointment.rescheduled y no un appointment.cancelled de la anterior'
);

-- ---------------------------------------------------------------------------------------------
-- 7. Cancelar a menos de 2 h: TOO_LATE_TO_CANCEL para el cliente; el personal sí puede.
-- ---------------------------------------------------------------------------------------------
insert into public.appointments (barber_id, customer_id, service_id, period, source)
values ('bbbbbbbb-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
        '5e000000-0000-0000-0000-000000000001',
        tstzrange(date_trunc('minute', now()) + interval '90 minutes',
                  date_trunc('minute', now()) + interval '150 minutes', '[)'), 'staff');

select tests.login('c0000000-0000-0000-0000-000000000001');
select throws_ok(
  $$ select public.cancel_appointment(
       (select id from public.appointments
        where customer_id = 'c1000000-0000-0000-0000-000000000001'
          and lower(period) = date_trunc('minute', now()) + interval '90 minutes'), 'Me surgió algo') $$,
  'P0001', 'TOO_LATE_TO_CANCEL',
  '7. El cliente no puede cancelar a menos de 2 h'
);
select throws_ok(
  $$ select public.reschedule_appointment(
       (select id from public.appointments
        where customer_id = 'c1000000-0000-0000-0000-000000000001'
          and lower(period) = date_trunc('minute', now()) + interval '90 minutes'), tests.at(7, '10:00')) $$,
  'P0001', 'TOO_LATE_TO_CANCEL',
  '7. Ni reprogramar'
);
reset role;
select tests.login('b0000000-0000-0000-0000-000000000001');
select throws_ok(
  $$ select public.cancel_appointment(
       (select id from public.appointments
        where customer_id = 'c1000000-0000-0000-0000-000000000001'
          and lower(period) = date_trunc('minute', now()) + interval '90 minutes'), null) $$,
  'P0001', 'REASON_REQUIRED',
  '7. El personal cancela con motivo'
);
select is(
  (select status::text from public.cancel_appointment(
     (select id from public.appointments
      where customer_id = 'c1000000-0000-0000-0000-000000000001'
        and lower(period) = date_trunc('minute', now()) + interval '90 minutes'), 'El barbero no puede')),
  'cancelled',
  '7. El barbero sí cancela a menos de 2 h'
);
reset role;

-- ---------------------------------------------------------------------------------------------
-- 8. Con 2 inasistencias, la siguiente reserva entra como pending_approval.
-- ---------------------------------------------------------------------------------------------
insert into public.appointments (barber_id, customer_id, service_id, period, source) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001',
   '5e000000-0000-0000-0000-000000000001',
   tstzrange(tests.at(-1, '08:00'), tests.at(-1, '09:00'), '[)'), 'customer'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001',
   '5e000000-0000-0000-0000-000000000001',
   tstzrange(tests.at(-1, '09:00'), tests.at(-1, '10:00'), '[)'), 'customer');

select tests.login('b0000000-0000-0000-0000-000000000001');
select throws_ok(
  $$ select public.mark_attendance(
       (select id from public.appointments
        where customer_id = 'c1000000-0000-0000-0000-000000000001'
          and barber_id = 'bbbbbbbb-0000-0000-0000-000000000001'
          and lower(period) = tests.at(2, '10:00')), false) $$,
  'P0001', 'NOT_STARTED',
  'No se marca asistencia antes de la hora de la cita'
);
select lives_ok(
  $$ select public.mark_attendance(
       (select id from public.appointments
        where customer_id = 'c2000000-0000-0000-0000-000000000001'
          and lower(period) = tests.at(-1, '08:00')), false) $$,
  '8. Primera inasistencia'
);
select lives_ok(
  $$ select public.mark_attendance(
       (select id from public.appointments
        where customer_id = 'c2000000-0000-0000-0000-000000000001'
          and lower(period) = tests.at(-1, '09:00')), false) $$,
  '8. Segunda inasistencia'
);
reset role;
select tests.login('c0000000-0000-0000-0000-000000000002');
select is(
  (select status::text from public.book_appointment('5e000000-0000-0000-0000-000000000001',
                                                    tests.at(4, '10:00'),
                                                    'bbbbbbbb-0000-0000-0000-000000000001')),
  'pending_approval',
  '8. La siguiente reserva queda pendiente de aprobación'
);
reset role;
select tests.login('b0000000-0000-0000-0000-000000000001');
select is(
  (select status::text from public.decide_pending(
     (select id from public.appointments
      where customer_id = 'c2000000-0000-0000-0000-000000000001'
        and lower(period) = tests.at(4, '10:00')), true)),
  'booked',
  'El barbero aprueba la reserva pendiente'
);
reset role;
select tests.login('a0000000-0000-0000-0000-000000000001');
select lives_ok(
  $$ select public.reset_no_shows('c2000000-0000-0000-0000-000000000001') $$,
  'El administrador reinicia el contador'
);
reset role;
select is(
  (select requires_approval from public.customer_booking_status
   where customer_id = 'c2000000-0000-0000-0000-000000000001'),
  false,
  '... y la marca de aprobación se quita'
);

-- ---------------------------------------------------------------------------------------------
-- Citas del personal.
-- ---------------------------------------------------------------------------------------------
select tests.login('b0000000-0000-0000-0000-000000000001');
select throws_ok(
  $$ select public.staff_create_appointment('c3000000-0000-0000-0000-000000000001',
       '5e000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', tests.at(1, '20:00')) $$,
  'P0001', 'NOT_FOUND',
  'El barbero B no agenda a un cliente que no ve'
);
reset role;
select tests.login('a0000000-0000-0000-0000-000000000001');
select is(
  (select source from public.staff_create_appointment('c3000000-0000-0000-0000-000000000001',
     '5e000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', tests.at(1, '20:00'))),
  'staff',
  'El administrador agenda a un cliente sin cuenta'
);
select throws_ok(
  $$ select public.staff_create_appointment('c3000000-0000-0000-0000-000000000001',
       '5e000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', tests.at(1, '21:30')) $$,
  'P0001', 'OUTSIDE_WORKING_HOURS',
  'La cita del personal también debe caber en el horario'
);
reset role;

-- ---------------------------------------------------------------------------------------------
-- Un cliente no usa las funciones del personal, ni sobre sus propias citas.
-- ---------------------------------------------------------------------------------------------
select tests.login('c0000000-0000-0000-0000-000000000001');
select throws_ok(
  $$ select public.mark_attendance(
       (select id from public.appointments
        where customer_id = 'c1000000-0000-0000-0000-000000000001'
          and barber_id = 'bbbbbbbb-0000-0000-0000-000000000001'
          and lower(period) = tests.at(2, '10:00')), true) $$,
  'P0001', 'NOT_FOUND',
  'El cliente no marca asistencia'
);
select throws_ok(
  $$ select public.decide_pending(
       (select id from public.appointments
        where customer_id = 'c1000000-0000-0000-0000-000000000001'
          and barber_id = 'bbbbbbbb-0000-0000-0000-000000000001'
          and lower(period) = tests.at(2, '10:00')), true) $$,
  'P0001', 'NOT_FOUND',
  'El cliente no aprueba reservas'
);
select throws_ok(
  $$ select public.create_time_off('aaaaaaaa-0000-0000-0000-000000000001',
                                   tests.at(9, '08:00'), tests.at(9, '09:00'), null) $$,
  'P0001', 'FORBIDDEN',
  'El cliente no crea bloqueos'
);
select throws_ok(
  $$ select * from public.list_conflicting_appointments(
       'aaaaaaaa-0000-0000-0000-000000000001', tests.at(2, '00:00'), tests.at(3, '00:00')) $$,
  'P0001', 'FORBIDDEN',
  'El cliente no lista citas de una agenda'
);
select throws_ok(
  $$ select public.staff_create_appointment('c1000000-0000-0000-0000-000000000001',
       '5e000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', tests.at(9, '10:00')) $$,
  'P0001', 'FORBIDDEN',
  'El cliente no crea citas como personal'
);
reset role;

-- ---------------------------------------------------------------------------------------------
-- Servidor (service_role): confirmación por WhatsApp y contrato para notifications.
-- ---------------------------------------------------------------------------------------------
select tests.login_service();
select results_eq(
  $$ select status::text, confirmed_via from public.confirm_appointment(
       (select id from public.appointments
        where customer_id = 'c1000000-0000-0000-0000-000000000001'
          and barber_id = 'bbbbbbbb-0000-0000-0000-000000000001'
          and lower(period) = tests.at(2, '10:00')), 'whatsapp') $$,
  $$ values ('confirmed', 'whatsapp') $$,
  'El servidor confirma una cita por el botón de WhatsApp'
);
select results_eq(
  $$ select customer_phone, whatsapp_opt_in, barber_name from public.get_appointment_for_notification(
       (select id from public.appointments
        where customer_id = 'c1000000-0000-0000-0000-000000000001'
          and barber_id = 'bbbbbbbb-0000-0000-0000-000000000001'
          and lower(period) = tests.at(2, '10:00'))) $$,
  $$ values ('+573000000001', true, 'Barbero B') $$,
  'get_appointment_for_notification da celular, autorización y barbero'
);
reset role;

select * from finish();
rollback;
