-- F8: despacho de booking_events (cursor con turno y huecos), aviso a la app con pg_net y
-- suscripciones push.
begin;
\ir ../fixtures/setup.psql
select plan(33);

-- Vault propio de la prueba (la semilla local también los crea; en CI puede no haber semilla).
delete from vault.secrets where name in ('notifications_dispatch_url', 'notifications_dispatch_secret');
select vault.create_secret('https://app.pruebas.test/api/notifications/dispatch', 'notifications_dispatch_url');
select vault.create_secret('secreto-de-prueba', 'notifications_dispatch_secret');

-- Un consumidor solo de esta prueba, que empieza después de los eventos que ya hay en la base.
-- Desde la secuencia: las pruebas deshechas también gastan ids (y dejan huecos).
insert into public.event_cursors (consumer, last_event_id)
values ('prueba', nextval('public.booking_events_id_seq'));

-- Crea una cita a la hora h de pasado mañana; el trigger de booking publica el evento.
create function tests.new_appointment(p_hour integer)
returns uuid
language sql
as $$
  insert into public.appointments (barber_id, customer_id, service_id, period, status, source)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
          '5e000000-0000-0000-0000-000000000001',
          tstzrange(tests.at(2, make_time(p_hour, 0, 0)), tests.at(2, make_time(p_hour + 1, 0, 0)), '[)'),
          'booked', 'customer')
  returning id;
$$;

create function tests.dispatch_requests()
returns integer
language sql
as $$
  select count(*)::integer from net.http_request_queue
  where url = 'https://app.pruebas.test/api/notifications/dispatch';
$$;

-- ---------------------------------------------------------------------------------------------
-- Quién puede llamar
-- ---------------------------------------------------------------------------------------------
select tests.login_anon();
select throws_ok($$ select * from public.claim_booking_events('prueba') $$, '42501', null,
  'Sin sesión no se toman eventos');
select throws_ok($$ select public.save_push_subscription('https://x.test/1', 'k', 'a') $$, '42501', null,
  'Sin sesión no se guarda una suscripción');
reset role;

select tests.login('a0000000-0000-0000-0000-000000000001');
select throws_ok($$ select * from public.claim_booking_events('prueba') $$, '42501', null,
  'Ni el administrador toma eventos: solo el servidor');
select throws_ok($$ select public.ack_booking_events('prueba', 1) $$, '42501', null,
  'Ni el administrador mueve un cursor');
select throws_ok($$ select * from public.list_push_targets('aaaaaaaa-0000-0000-0000-000000000001') $$,
  '42501', null, 'Ni el administrador lee las suscripciones de otro');
select throws_ok($$ select * from public.booking_events $$, '42501', null,
  'booking_events sigue cerrada para la sesión');
reset role;
select set_config('request.jwt.claims', '{}', true);

-- ---------------------------------------------------------------------------------------------
-- Aviso a la app con pg_net
-- ---------------------------------------------------------------------------------------------
select tests.dispatch_requests() as before_requests \gset
select tests.new_appointment(8);
select is(tests.dispatch_requests(), :before_requests + 1,
  'Una cita nueva encola un POST a la ruta de despacho');
select is(
  (select headers ->> 'Authorization' from net.http_request_queue
   where url = 'https://app.pruebas.test/api/notifications/dispatch' order by id desc limit 1),
  'Bearer secreto-de-prueba',
  'El POST lleva el secreto de Vault'
);

delete from vault.secrets where name = 'notifications_dispatch_secret';
select tests.new_appointment(10);
select is(tests.dispatch_requests(), :before_requests + 1,
  'Sin el secreto en Vault no se pide nada, y la cita igual se crea');
select vault.create_secret('secreto-de-prueba', 'notifications_dispatch_secret');

-- ---------------------------------------------------------------------------------------------
-- Cursor y turno
-- ---------------------------------------------------------------------------------------------
select tests.login_service();
select is((select count(*)::integer from public.claim_booking_events('prueba')), 2,
  'El servidor toma los dos eventos nuevos');
select throws_ok($$ select * from public.claim_booking_events('prueba') $$, 'P0001', 'BUSY',
  'Mientras el turno siga tomado, otro despacho no recibe nada');
reset role;
select set_config('request.jwt.claims', '{}', true);
select max(id) as last_id from public.booking_events \gset

select tests.login_service();
select is(public.ack_booking_events('prueba', :last_id), false,
  'ack avanza el cursor y dice que no quedan eventos');
reset role;
select is((select last_event_id from public.event_cursors where consumer = 'prueba'), :last_id::bigint,
  'El cursor quedó en el último evento');
select is((select lease_until from public.event_cursors where consumer = 'prueba'), null,
  'ack suelta el turno');

select tests.new_appointment(12);
select tests.new_appointment(14);
select tests.login_service();
select is((select count(*)::integer from public.claim_booking_events('prueba', 1)), 1,
  'Con límite 1 toma un solo evento');
select is(public.ack_booking_events('prueba', :last_id + 1), true,
  'ack avisa que todavía quedan eventos');
select results_eq(
  $$ select id from public.claim_booking_events('prueba') $$,
  format('values (%s::bigint)', :last_id + 2),
  'El siguiente despacho sigue donde quedó'
);
select is(public.ack_booking_events('prueba', :last_id + 2), false, 'Al día');

-- Un despacho que se cae después de tomar el turno: al vencer, otro toma los mismos eventos.
reset role;
select tests.new_appointment(16);
select tests.login_service();
select count(*) from public.claim_booking_events('prueba');
reset role;
update public.event_cursors set lease_until = now() - interval '1 second' where consumer = 'prueba';
select tests.login_service();
select results_eq(
  $$ select id from public.claim_booking_events('prueba') $$,
  format('values (%s::bigint)', :last_id + 3),
  'Con el turno vencido, otro despacho vuelve a tomar el evento sin confirmar'
);
select public.ack_booking_events('prueba', :last_id + 3);

select throws_ok($$ select * from public.claim_booking_events('Prueba; drop') $$, 'P0001', 'INVALID_INPUT',
  'El nombre del consumidor se valida');
reset role;
select set_config('request.jwt.claims', '{}', true);

-- ---------------------------------------------------------------------------------------------
-- Huecos: un id que falta puede ser una reserva que todavía no termina
-- ---------------------------------------------------------------------------------------------
select nextval('public.booking_events_id_seq') as gap_id \gset
select tests.new_appointment(18);
select tests.login_service();
select is((select count(*)::integer from public.claim_booking_events('prueba')), 0,
  'Se para antes de un hueco reciente');
select is(public.ack_booking_events('prueba', null), true,
  'ack sin avanzar suelta el turno y avisa que hay pendientes');
reset role;

update public.booking_events set created_at = now() - interval '3 minutes' where id = :gap_id + 1;
select tests.login_service();
select results_eq(
  $$ select id from public.claim_booking_events('prueba') $$,
  format('values (%s::bigint)', :gap_id + 1),
  'Un hueco de más de 2 minutos es una transacción deshecha: lo salta'
);
select public.ack_booking_events('prueba', :gap_id + 1);
reset role;
select set_config('request.jwt.claims', '{}', true);

-- ---------------------------------------------------------------------------------------------
-- Respaldo de pg_cron
-- ---------------------------------------------------------------------------------------------
update public.event_cursors set last_event_id = (select max(id) from public.booking_events)
where consumer = 'push';
select tests.dispatch_requests() as before_backstop \gset
select private.notifications_backstop();
select is(tests.dispatch_requests(), :before_backstop,
  'Sin pendientes, el respaldo no llama a la app');
update public.event_cursors set last_event_id = last_event_id - 1 where consumer = 'push';
select private.notifications_backstop();
select is(tests.dispatch_requests(), :before_backstop + 1,
  'Con un evento pendiente para push, el respaldo pide un despacho');
select is((select count(*)::integer from cron.job where jobname = 'notifications-dispatch'
           and schedule = '* * * * *'), 1, 'El respaldo corre cada minuto');

-- ---------------------------------------------------------------------------------------------
-- Suscripciones push
-- ---------------------------------------------------------------------------------------------
select tests.login('c0000000-0000-0000-0000-000000000001');
select throws_ok($$ select public.save_push_subscription('https://push.test/c1', 'k', 'a') $$,
  'P0001', 'FORBIDDEN', 'Un cliente no recibe avisos push');
reset role;

select tests.login('b0000000-0000-0000-0000-000000000001');
select throws_ok($$ select public.save_push_subscription('http://push.test/b', 'k', 'a') $$,
  'P0001', 'INVALID_INPUT', 'El endpoint debe ser https');
select lives_ok($$ select public.save_push_subscription('https://push.test/compartido', 'kb', 'ab') $$,
  'El barbero B guarda la suscripción de su celular');
reset role;

-- El dueño ingresa en el mismo navegador: el endpoint pasa a su cuenta.
select tests.login('a0000000-0000-0000-0000-000000000001');
select public.save_push_subscription('https://push.test/compartido', 'ka', 'aa');
reset role;
select set_config('request.jwt.claims', '{}', true);
select is(
  (select user_id from public.push_subscriptions where endpoint = 'https://push.test/compartido'),
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'Un mismo endpoint queda con la última cuenta que lo activó'
);

select tests.login('b0000000-0000-0000-0000-000000000001');
select public.save_push_subscription('https://push.test/b', 'kb', 'ab');
select is((select count(*)::integer from public.push_subscriptions), 1,
  'Cada cuenta ve solo sus suscripciones (RLS)');
reset role;

select tests.login_service();
select results_eq(
  $$ select endpoint from public.list_push_targets('bbbbbbbb-0000-0000-0000-000000000001') $$,
  $$ values ('https://push.test/b') $$,
  'El servidor encuentra las suscripciones del barbero de la cita'
);
reset role;
select set_config('request.jwt.claims', '{}', true);

delete from public.staff_roles
where user_id = 'b0000000-0000-0000-0000-000000000001' and role = 'barber';
select tests.login_service();
select is((select count(*)::integer from public.list_push_targets('bbbbbbbb-0000-0000-0000-000000000001')), 0,
  'Sin el rol de barbero ya no recibe avisos');
reset role;

select * from finish();
rollback;
