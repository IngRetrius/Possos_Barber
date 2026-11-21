-- Asistencia por omisión (20/11/2026, docs/04 "Inasistencias"): la cita que termina sin marca
-- se cierra sola como completed y, en la misma transacción, se cobra con el precio de la reserva;
-- "No vino" vale también sobre una cita cerrada (el barbero, el mismo día; el administrador,
-- siempre) y anula su cobro.
-- now() es fijo dentro de la transacción. Las citas "de hoy" terminan 1 a 3 minutos antes de
-- now(): si la prueba corre justo después de la medianoche de Bogotá, serían de ayer.
begin;
\ir ../fixtures/setup.psql
select plan(21);

insert into public.appointments (id, barber_id, customer_id, service_id, period, status, price_cop, source) values
  -- Barbero B, hoy, terminó hace un minuto, reservada y con precio.
  ('ae000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001',
   'c3000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001',
   tstzrange(now() - interval '2 minutes', now() - interval '1 minute', '[)'), 'booked', 30000, 'staff'),
  -- Barbero B, hoy, confirmada y sin precio ([PENDIENTE]).
  ('ae000000-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001',
   'c3000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001',
   tstzrange(now() - interval '3 minutes', now() - interval '2 minutes', '[)'), 'confirmed', null, 'staff'),
  -- Barbero A: en curso, futura y pendiente de aprobación (de ayer).
  ('ae000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001',
   tstzrange(now() - interval '10 minutes', now() + interval '50 minutes', '[)'), 'booked', 30000, 'customer'),
  ('ae000000-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001',
   tstzrange(tests.at(2, '10:00'), tests.at(2, '11:00'), '[)'), 'booked', 30000, 'customer'),
  ('ae000000-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001',
   'c2000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001',
   tstzrange(tests.at(-1, '08:00'), tests.at(-1, '09:00'), '[)'), 'pending_approval', 30000, 'customer'),
  -- Barbero B, ayer, reservada: se cierra y se cobra (dentro de los 3 días).
  ('ae000000-0000-0000-0000-000000000006', 'bbbbbbbb-0000-0000-0000-000000000001',
   'c3000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001',
   tstzrange(tests.at(-1, '10:00'), tests.at(-1, '11:00'), '[)'), 'booked', 25000, 'staff'),
  -- Barbero A, hace 5 días, reservada: se cierra, pero no se cobra sola.
  ('ae000000-0000-0000-0000-000000000007', 'aaaaaaaa-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001',
   tstzrange(tests.at(-5, '10:00'), tests.at(-5, '11:00'), '[)'), 'booked', 30000, 'customer');

-- ---------------------------------------------------------------------------------------------
-- Cierre automático
-- ---------------------------------------------------------------------------------------------
select is(private.booking_close_past(), 4, 'El cierre toma las citas que terminaron sin marca');
select results_eq(
  $$ select id::text, status::text from public.appointments
     where id::text like 'ae000000-%' order by id $$,
  $$ values ('ae000000-0000-0000-0000-000000000001', 'completed'),
            ('ae000000-0000-0000-0000-000000000002', 'completed'),
            ('ae000000-0000-0000-0000-000000000003', 'booked'),
            ('ae000000-0000-0000-0000-000000000004', 'booked'),
            ('ae000000-0000-0000-0000-000000000005', 'pending_approval'),
            ('ae000000-0000-0000-0000-000000000006', 'completed'),
            ('ae000000-0000-0000-0000-000000000007', 'completed') $$,
  'Reservada y confirmada pasan a completed; en curso, futura y pendiente no se tocan'
);
select is(
  (select count(*)::integer from public.booking_events
   where appointment_id = 'ae000000-0000-0000-0000-000000000001'
     and type = 'appointment.status_changed' and payload ->> 'status' = 'completed'),
  1,
  'El cierre publica appointment.status_changed'
);
select is(private.booking_close_past(), 0, 'Cerrar otra vez no cambia nada');
select ok(
  exists (select 1 from cron.job where jobname = 'booking-close-past' and schedule = '* * * * *'),
  'pg_cron cierra las citas cada minuto'
);

-- ---------------------------------------------------------------------------------------------
-- Cobro automático, en la misma transacción del cierre
-- ---------------------------------------------------------------------------------------------
select results_eq(
  $$ select amount_cop, barber_pct, charged_at, created_by from public.charges
     where appointment_id = 'ae000000-0000-0000-0000-000000000001' $$,
  $$ values (30000, 40.00::numeric(5, 2), now() - interval '1 minute', null::uuid) $$,
  'Se cobra el precio de la reserva con el porcentaje vigente, a la hora de fin de la cita'
);
select is(
  (select amount_cop from public.charges where appointment_id = 'ae000000-0000-0000-0000-000000000006'),
  25000,
  'Una cita de ayer que se cierra también se cobra'
);
select is_empty(
  $$ select 1 from public.charges where appointment_id = 'ae000000-0000-0000-0000-000000000002' $$,
  'Sin precio no se cobra: queda para registrar a mano'
);
select is_empty(
  $$ select 1 from public.charges
     where appointment_id in ('ae000000-0000-0000-0000-000000000003',
                              'ae000000-0000-0000-0000-000000000007') $$,
  'No se cobran la cita en curso ni la que terminó hace más de 3 días'
);
select private.commissions_sync_appointment('ae000000-0000-0000-0000-000000000001');
select is(
  (select count(*)::integer from public.charges where appointment_id::text like 'ae000000-%'),
  2,
  'Sincronizar otra vez no duplica cobros'
);

-- ---------------------------------------------------------------------------------------------
-- "No vino" sobre citas cerradas
-- ---------------------------------------------------------------------------------------------
select tests.login('b0000000-0000-0000-0000-000000000001');
select is(
  (select status::text from public.mark_attendance('ae000000-0000-0000-0000-000000000001', false)),
  'no_show',
  'El barbero marca "No vino" en una cita de hoy que se cerró sola'
);
select throws_ok(
  $$ select public.mark_attendance('ae000000-0000-0000-0000-000000000002', true) $$,
  'P0001', 'INVALID_STATUS',
  '"Vino" no aplica a una cita ya cerrada'
);
select throws_ok(
  $$ select public.mark_attendance('ae000000-0000-0000-0000-000000000006', false) $$,
  'P0001', 'INVALID_STATUS',
  'El barbero no cambia una cita cerrada de otro día'
);
select throws_ok(
  $$ select public.mark_attendance('ae000000-0000-0000-0000-000000000003', false) $$,
  'P0001', 'NOT_FOUND',
  'El barbero no marca citas de otro barbero'
);
select throws_ok(
  $$ select public.mark_attendance('ae000000-0000-0000-0000-000000000001', false) $$,
  'P0001', 'INVALID_STATUS',
  'Una cita no se marca dos veces como inasistencia'
);
reset role;

select tests.login('a0000000-0000-0000-0000-000000000001');
select is(
  (select status::text from public.mark_attendance('ae000000-0000-0000-0000-000000000006', false)),
  'no_show',
  'El administrador marca "No vino" en una cita cerrada de otro día'
);
select is(
  (select status::text from public.mark_attendance('ae000000-0000-0000-0000-000000000003', false)),
  'no_show',
  '"No vino" vale desde la hora de inicio, aunque la cita siga en curso'
);
select throws_ok(
  $$ select public.mark_attendance('ae000000-0000-0000-0000-000000000004', false) $$,
  'P0001', 'NOT_STARTED',
  'Antes de la hora de inicio no se marca'
);
reset role;

select is(
  (select no_show_count from public.customer_booking_status
   where customer_id = 'c3000000-0000-0000-0000-000000000001'),
  2,
  'Cada "No vino" suma una inasistencia, también sobre una cita cerrada'
);
select results_eq(
  $$ select appointment_id::text, voided_at is not null, void_reason from public.charges
     where appointment_id::text like 'ae000000-%' order by appointment_id $$,
  $$ values ('ae000000-0000-0000-0000-000000000001', true, 'No vino'),
            ('ae000000-0000-0000-0000-000000000006', true, 'No vino') $$,
  'El cobro de una cita que pasa a no_show se anula en el acto con el motivo "No vino"'
);
select is(
  private.booking_close_past(), 0,
  'Una inasistencia no vuelve a cerrarse como atendida'
);

select * from finish();
rollback;
