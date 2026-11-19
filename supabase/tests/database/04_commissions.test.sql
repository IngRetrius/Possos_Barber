-- Cobros y liquidación (módulo commissions) y pruebas obligatorias 9 y 10 de docs/09.
begin;
\ir ../fixtures/setup.psql
select plan(22);

insert into public.appointments (id, barber_id, customer_id, service_id, period, status, price_cop, source) values
  ('ad000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001',
   tstzrange(tests.at(-1, '10:00'), tests.at(-1, '11:00'), '[)'), 'completed', 12345, 'customer'),
  ('ad000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001',
   tstzrange(tests.at(2, '10:00'), tests.at(2, '11:00'), '[)'), 'booked', 30000, 'customer'),
  ('ad000000-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001',
   'c2000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001',
   tstzrange(tests.at(-1, '11:00'), tests.at(-1, '12:00'), '[)'), 'completed', 30000, 'customer'),
  ('ad000000-0000-0000-0000-000000000004', 'bbbbbbbb-0000-0000-0000-000000000001',
   'c2000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001',
   tstzrange(tests.at(-2, '11:00'), tests.at(-2, '12:00'), '[)'), 'completed', 20000, 'customer'),
  ('ad000000-0000-0000-0000-000000000005', 'bbbbbbbb-0000-0000-0000-000000000001',
   'c2000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001',
   tstzrange(tests.at(-1, '13:00'), tests.at(-1, '14:00'), '[)'), 'completed', 20000, 'customer');

-- ---------------------------------------------------------------------------------------------
-- 9. record_charge exige la cita completed y sin cobro; el porcentaje se copia.
-- ---------------------------------------------------------------------------------------------
select tests.login('a0000000-0000-0000-0000-000000000001');
select throws_ok(
  $$ select public.record_charge('ad000000-0000-0000-0000-000000000002', null) $$,
  'P0001', 'NOT_COMPLETED',
  '9. No se cobra una cita que no está completed'
);
select is(
  (select amount_cop from public.record_charge('ad000000-0000-0000-0000-000000000001', null)),
  12345,
  '9. Sin monto, el cobro toma el precio de la reserva'
);
select throws_ok(
  $$ select public.record_charge('ad000000-0000-0000-0000-000000000001', 10000) $$,
  'P0001', 'ALREADY_CHARGED',
  '9. Una cita no se cobra dos veces'
);
select results_eq(
  $$ select barber_amount_cop, business_amount_cop from public.charges
     where appointment_id = 'ad000000-0000-0000-0000-000000000001' $$,
  $$ values (6173, 6172) $$,
  'El reparto redondea al peso y suma el valor cobrado'
);
update public.commission_rates set barber_pct = 60 where barber_id = 'aaaaaaaa-0000-0000-0000-000000000001';
select results_eq(
  $$ select barber_pct, barber_amount_cop from public.charges
     where appointment_id = 'ad000000-0000-0000-0000-000000000001' $$,
  $$ values (50.00::numeric(5, 2), 6173) $$,
  '9. Cambiar el porcentaje no altera cobros anteriores'
);
reset role;

-- ---------------------------------------------------------------------------------------------
-- Barbero B: sus cobros, corrección del mismo día y 10.
-- ---------------------------------------------------------------------------------------------
select tests.login('b0000000-0000-0000-0000-000000000001');
select throws_ok(
  $$ select public.record_charge('ad000000-0000-0000-0000-000000000002', 30000) $$,
  'P0001', 'NOT_FOUND',
  'El barbero B no cobra citas de A'
);
select lives_ok(
  $$ select public.record_charge('ad000000-0000-0000-0000-000000000003', 30000) $$,
  'El barbero B cobra su cita'
);
select lives_ok(
  $$ select public.record_charge('ad000000-0000-0000-0000-000000000004', 20000) $$,
  'El barbero B cobra otra cita'
);
select results_eq(
  $$ select amount_cop, barber_pct from public.update_charge(
       (select id from public.charges where appointment_id = 'ad000000-0000-0000-0000-000000000003'), 35000) $$,
  $$ values (35000, 40.00::numeric(5, 2)) $$,
  'El barbero corrige el monto el mismo día y el porcentaje no cambia'
);
select results_eq(
  $$ select appointment_id from public.charges order by appointment_id $$,
  $$ values ('ad000000-0000-0000-0000-000000000003'::uuid), ('ad000000-0000-0000-0000-000000000004'::uuid) $$,
  '10. El barbero no lee cobros de otro barbero'
);
update public.commission_rates set barber_pct = 100 where barber_id = 'bbbbbbbb-0000-0000-0000-000000000001';
select is(
  (select barber_pct from public.commission_rates),
  40.00::numeric(5, 2),
  '10. El barbero ve su porcentaje y no lo puede cambiar'
);
select throws_ok(
  $$ select * from public.get_settlement(tests.day(-7), tests.day(0), 'aaaaaaaa-0000-0000-0000-000000000001') $$,
  'P0001', 'FORBIDDEN',
  'El barbero no ve la liquidación de otro'
);
select throws_ok(
  $$ select public.void_charge((select id from public.charges limit 1), 'Error') $$,
  'P0001', 'FORBIDDEN',
  'Solo el administrador anula cobros'
);
reset role;

-- Un cobro de ayer ya no lo corrige el barbero.
update public.charges set charged_at = tests.at(-1, '20:00')
where appointment_id = 'ad000000-0000-0000-0000-000000000004';
select tests.login('b0000000-0000-0000-0000-000000000001');
select throws_ok(
  $$ select public.update_charge(
       (select id from public.charges where appointment_id = 'ad000000-0000-0000-0000-000000000004'), 1) $$,
  'P0001', 'TOO_LATE_TO_EDIT',
  'El barbero no corrige un cobro de otro día'
);
select results_eq(
  $$ select services_count, amount_cop, barber_amount_cop, business_amount_cop
     from public.get_settlement(tests.day(-7), tests.day(0)) $$,
  $$ values (2, 55000::bigint, 22000::bigint, 33000::bigint) $$,
  'Liquidación del barbero: suma sus cobros'
);
reset role;

-- ---------------------------------------------------------------------------------------------
-- Administrador: anula y la liquidación excluye lo anulado.
-- ---------------------------------------------------------------------------------------------
select tests.login('a0000000-0000-0000-0000-000000000001');
select throws_ok(
  $$ select public.void_charge(
       (select id from public.charges where appointment_id = 'ad000000-0000-0000-0000-000000000003'), ' ') $$,
  'P0001', 'REASON_REQUIRED',
  'Anular exige motivo'
);
select lives_ok(
  $$ select public.void_charge(
       (select id from public.charges where appointment_id = 'ad000000-0000-0000-0000-000000000003'),
       'El cliente no pagó') $$,
  'El administrador anula un cobro con motivo'
);
select results_eq(
  $$ select services_count, amount_cop from public.get_settlement(tests.day(-7), tests.day(0),
       'bbbbbbbb-0000-0000-0000-000000000001') $$,
  $$ values (1, 20000::bigint) $$,
  'get_settlement excluye los cobros anulados'
);
select results_eq(
  $$ select barber_id from public.get_settlement(tests.day(-7), tests.day(0)) $$,
  $$ values ('aaaaaaaa-0000-0000-0000-000000000001'::uuid), ('bbbbbbbb-0000-0000-0000-000000000001'::uuid) $$,
  'El administrador ve una fila por barbero'
);
select throws_ok(
  $$ select public.update_charge(
       (select id from public.charges where appointment_id = 'ad000000-0000-0000-0000-000000000003'), 1) $$,
  'P0001', 'INVALID_STATUS',
  'Un cobro anulado no se corrige'
);
delete from public.commission_rates where barber_id = 'bbbbbbbb-0000-0000-0000-000000000001';
select throws_ok(
  $$ select public.record_charge('ad000000-0000-0000-0000-000000000005', 20000) $$,
  'P0001', 'NO_COMMISSION_RATE',
  'Sin porcentaje definido no se registra el cobro'
);
reset role;

select tests.login('c0000000-0000-0000-0000-000000000001');
select throws_ok(
  $$ select public.record_charge('ad000000-0000-0000-0000-000000000001', 1) $$,
  'P0001', 'NOT_FOUND',
  'Un cliente no registra cobros'
);
reset role;

select * from finish();
rollback;
