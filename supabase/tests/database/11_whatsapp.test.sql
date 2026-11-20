-- F7: recordatorios por WhatsApp. Permisos de las funciones del servidor, RLS de las tablas que
-- cambiaron, el despacho de message_jobs (for update skip locked), los estados del webhook y el
-- respaldo de pg_cron.
begin;
\ir ../fixtures/setup.psql
select plan(45);

-- Vault propio de la prueba (como 09_despacho).
delete from vault.secrets where name in ('notifications_dispatch_url', 'notifications_dispatch_secret');
select vault.create_secret('https://app.pruebas.test/api/notifications/dispatch', 'notifications_dispatch_url');
select vault.create_secret('secreto-de-prueba', 'notifications_dispatch_secret');

create function tests.dispatch_requests()
returns integer
language sql
as $$
  select count(*)::integer from net.http_request_queue
  where url = 'https://app.pruebas.test/api/notifications/dispatch';
$$;

-- Una cita de Cliente Uno con Barbero A, pasado mañana a las 10:00.
insert into public.appointments (id, barber_id, customer_id, service_id, period, status, source)
values ('a7000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
        'c1000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001',
        tstzrange(tests.at(2, '10:00'), tests.at(2, '11:00'), '[)'), 'booked', 'customer');

-- ---------------------------------------------------------------------------------------------
-- Quién puede llamar
-- ---------------------------------------------------------------------------------------------
select tests.login_anon();
select throws_ok($$ select * from public.get_appointment_for_notification('a7000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'Sin sesión no se lee una cita para notificar');
select throws_ok($$ select * from public.claim_message_jobs() $$, '42501', null,
  'Sin sesión no se toman trabajos');
reset role;

select tests.login('c0000000-0000-0000-0000-000000000001');
select throws_ok($$ select * from public.get_appointment_for_notification('a7000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'Ni el cliente de la cita la lee por la función de notificaciones');
select throws_ok($$ select public.find_appointment_for_phone('+573000000001') $$, '42501', null,
  'Un cliente no busca citas por celular');
reset role;

select tests.login('a0000000-0000-0000-0000-000000000001');
select throws_ok($$ select * from public.get_appointment_for_notification('a7000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'Ni el administrador: get_appointment_for_notification es solo de la service role');
select throws_ok($$ select * from public.claim_message_jobs() $$, '42501', null,
  'Ni el administrador toma trabajos');
select throws_ok($$ select public.finish_message_job(gen_random_uuid(), 'sent', 'wamid.x') $$, '42501', null,
  'Ni el administrador cierra un trabajo');
select throws_ok($$ select public.record_message_status('wamid.x', 'delivered') $$, '42501', null,
  'Ni el administrador registra un estado');
select throws_ok($$ select public.find_appointment_for_phone('+573000000001') $$, '42501', null,
  'Ni el administrador busca citas por celular');
select throws_ok(
  $$ insert into public.message_jobs (appointment_id, kind, channel, send_at)
     values ('a7000000-0000-0000-0000-000000000001', 'confirmation', 'whatsapp', now()) $$,
  '42501', null, 'Nadie de la app escribe en message_jobs');
select throws_ok($$ select * from public.inbound_messages $$, '42501', null,
  'inbound_messages sigue cerrada para la sesión');
reset role;
select set_config('request.jwt.claims', '{}', true);

select tests.login_service();
select is(
  (select customer_phone from public.get_appointment_for_notification('a7000000-0000-0000-0000-000000000001')),
  '+573000000001', 'La service role sí lee la cita con el celular');
select is(public.find_appointment_for_phone('+573000000001'), 'a7000000-0000-0000-0000-000000000001'::uuid,
  'find_appointment_for_phone da la próxima cita del celular');
select is(public.find_appointment_for_phone('3000000001'), null,
  'Un celular que no es +57 y 10 dígitos no busca nada');
select is(public.find_appointment_for_phone('+573009999999'), null, 'Un celular sin citas da null');
reset role;
select set_config('request.jwt.claims', '{}', true);

-- ---------------------------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------------------------
select is_empty(
  $$ select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity $$,
  'Todas las tablas de public siguen con RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.message_jobs'::regclass)
  and (select relrowsecurity from pg_class where oid = 'public.notification_settings'::regclass)
  and (select relrowsecurity from pg_class where oid = 'public.inbound_messages'::regclass),
  'message_jobs, notification_settings e inbound_messages tienen RLS'
);
select ok(
  exists (select 1 from pg_constraint where conname = 'no_double_booking'
          and conrelid = 'public.appointments'::regclass and contype = 'x'),
  'La restricción de exclusión de appointments sigue ahí'
);

insert into public.message_jobs (id, appointment_id, kind, offset_min, channel, template, send_at, status, last_error)
values ('10b00000-0000-0000-0000-000000000099', 'a7000000-0000-0000-0000-000000000001', 'confirmation', 0,
        'whatsapp', 'cita_confirmada', now() - interval '1 hour', 'failed', '131026: Message undeliverable');

select tests.login('a0000000-0000-0000-0000-000000000001');
select is((select last_error from public.message_jobs where id = '10b00000-0000-0000-0000-000000000099'),
  '131026: Message undeliverable', 'El barbero de la cita ve el error del mensaje');
reset role;
select tests.login('b0000000-0000-0000-0000-000000000001');
select is_empty($$ select 1 from public.message_jobs where id = '10b00000-0000-0000-0000-000000000099' $$,
  'Otro barbero no ve los mensajes de citas ajenas');
update public.notification_settings set send_cancellation = true where id;
reset role;
select is((select send_cancellation from public.notification_settings), false,
  'Un barbero que no es administrador no cambia el aviso de cancelación');
select tests.login('c0000000-0000-0000-0000-000000000001');
select is_empty($$ select 1 from public.message_jobs $$, 'El cliente no ve el registro de mensajes');
reset role;
select tests.login('a0000000-0000-0000-0000-000000000001');
update public.notification_settings set send_cancellation = true where id;
reset role;
select is((select send_cancellation from public.notification_settings), true,
  'El administrador activa el aviso de cancelación');
select set_config('request.jwt.claims', '{}', true);
delete from public.message_jobs where id = '10b00000-0000-0000-0000-000000000099';

-- ---------------------------------------------------------------------------------------------
-- Consumidor whatsapp
-- ---------------------------------------------------------------------------------------------
select ok('whatsapp' = any (private.notifications_consumers()), 'whatsapp es un consumidor del despacho');
select ok(exists (select 1 from public.event_cursors where consumer = 'whatsapp'),
  'El cursor de whatsapp existe desde la migración');

-- ---------------------------------------------------------------------------------------------
-- Tomar trabajos: for update skip locked y trabajos colgados
-- ---------------------------------------------------------------------------------------------
insert into public.message_jobs (id, appointment_id, kind, offset_min, channel, template, send_at, status, updated_at) values
  -- 1: vencido. 2: futuro. 3: colgado en sending hace 10 min. 4: en sending ahora (otro despacho).
  -- 5: push vencido (no es de WhatsApp).
  ('10b00000-0000-0000-0000-000000000001', 'a7000000-0000-0000-0000-000000000001', 'confirmation', 0,
   'whatsapp', 'cita_confirmada', now() - interval '1 minute', 'scheduled', now()),
  ('10b00000-0000-0000-0000-000000000002', 'a7000000-0000-0000-0000-000000000001', 'reminder', 1440,
   'whatsapp', 'recordatorio_24h', now() + interval '1 day', 'scheduled', now()),
  ('10b00000-0000-0000-0000-000000000003', 'a7000000-0000-0000-0000-000000000001', 'reminder', 120,
   'whatsapp', 'recordatorio_2h', now() - interval '20 minutes', 'sending', now() - interval '10 minutes'),
  ('10b00000-0000-0000-0000-000000000004', 'a7000000-0000-0000-0000-000000000001', 'reminder', 60,
   'whatsapp', 'recordatorio_2h', now() - interval '1 minute', 'sending', now()),
  ('10b00000-0000-0000-0000-000000000005', 'a7000000-0000-0000-0000-000000000001', 'reminder', 1440,
   'push', null, now() - interval '1 minute', 'scheduled', now());

select tests.login_service();
select results_eq(
  $$ select id from public.claim_message_jobs() order by id $$,
  $$ values ('10b00000-0000-0000-0000-000000000001'::uuid), ('10b00000-0000-0000-0000-000000000003'::uuid) $$,
  'Toma el vencido y el colgado; no el futuro, ni el que otro despacho tiene, ni el de push'
);
select is_empty($$ select 1 from public.claim_message_jobs() $$,
  'Un segundo despacho no vuelve a tomar los mismos trabajos');
reset role;
select results_eq(
  $$ select status, attempts from public.message_jobs
     where id in ('10b00000-0000-0000-0000-000000000001', '10b00000-0000-0000-0000-000000000003') order by id $$,
  $$ values ('sending'::text, 1), ('sending'::text, 1) $$,
  'Quedan en sending con un intento más'
);

update public.message_jobs set send_at = now() - interval '1 minute'
where id = '10b00000-0000-0000-0000-000000000002';
insert into public.message_jobs (appointment_id, kind, offset_min, channel, template, send_at)
select 'a7000000-0000-0000-0000-000000000001', 'reminder', n, 'whatsapp', 'recordatorio_2h', now() - interval '1 minute'
from generate_series(1, 5) n;
select tests.login_service();
select is((select count(*)::integer from public.claim_message_jobs(2)), 2, 'Respeta el límite');
select is((select count(*)::integer from public.claim_message_jobs(50)), 4, 'Y el siguiente toma el resto');

-- ---------------------------------------------------------------------------------------------
-- Cerrar trabajos
-- ---------------------------------------------------------------------------------------------
select is(public.finish_message_job('10b00000-0000-0000-0000-000000000001', 'sent', 'wamid.PRUEBA1'), true,
  'sent cierra el trabajo');
select is(public.finish_message_job('10b00000-0000-0000-0000-000000000001', 'failed', null, 'tarde'), false,
  'Un trabajo que ya no está en sending no se vuelve a cerrar');
select is(public.finish_message_job('10b00000-0000-0000-0000-000000000003', 'retry', null, 'NETWORK',
  now() + interval '5 minutes'), true, 'retry lo devuelve a scheduled');
select throws_ok($$ select public.finish_message_job('10b00000-0000-0000-0000-000000000004', 'sent') $$,
  'P0001', 'INVALID_INPUT', 'sent sin el id de Meta es un error');
reset role;
select results_eq(
  $$ select status, provider_message_id, sent_at is not null, last_error from public.message_jobs
     where id = '10b00000-0000-0000-0000-000000000001' $$,
  $$ values ('sent'::text, 'wamid.PRUEBA1'::text, true, null::text) $$,
  'Guarda el id de Meta y la hora del envío'
);
select results_eq(
  $$ select status, send_at > now(), last_error from public.message_jobs
     where id = '10b00000-0000-0000-0000-000000000003' $$,
  $$ values ('scheduled'::text, true, 'NETWORK'::text) $$,
  'El reintento queda programado más tarde, con el error'
);

-- ---------------------------------------------------------------------------------------------
-- Estados del webhook: solo avanzan
-- ---------------------------------------------------------------------------------------------
select tests.login_service();
select is(public.record_message_status('wamid.PRUEBA1', 'delivered', now(), null, 'utility'),
  'a7000000-0000-0000-0000-000000000001'::uuid, 'delivered devuelve la cita del mensaje');
select public.record_message_status('wamid.PRUEBA1', 'sent');
reset role;
select results_eq(
  $$ select status, pricing_category from public.message_jobs where provider_message_id = 'wamid.PRUEBA1' $$,
  $$ values ('delivered'::text, 'utility'::text) $$,
  'Un sent que llega tarde no hace retroceder a delivered, y la categoría queda'
);
select tests.login_service();
select public.record_message_status('wamid.PRUEBA1', 'read');
select public.record_message_status('wamid.PRUEBA1', 'failed', now(), '131026: Message undeliverable');
reset role;
select results_eq(
  $$ select status, last_error from public.message_jobs where provider_message_id = 'wamid.PRUEBA1' $$,
  $$ values ('read'::text, null::text) $$,
  'read avanza; un failed después de leído no cuenta'
);

update public.message_jobs set status = 'sent', provider_message_id = 'wamid.PRUEBA2'
where id = '10b00000-0000-0000-0000-000000000004';
select tests.login_service();
select public.record_message_status('wamid.PRUEBA2', 'failed', now(), '131026: Message undeliverable');
select is(public.record_message_status('wamid.NO-EXISTE', 'delivered'), null,
  'Un mensaje que no es un trabajo (respuesta de servicio) devuelve null');
select throws_ok($$ select public.record_message_status('wamid.PRUEBA2', 'borrado') $$, 'P0001', 'INVALID_INPUT',
  'Un estado desconocido es un error');
reset role;
select is((select last_error from public.message_jobs where provider_message_id = 'wamid.PRUEBA2'),
  '131026: Message undeliverable', 'failed guarda el error para el panel');

-- ---------------------------------------------------------------------------------------------
-- Respaldo de pg_cron: también por trabajos vencidos
-- ---------------------------------------------------------------------------------------------
update public.event_cursors
set last_event_id = (select coalesce(max(id), 0) from public.booking_events)
where consumer = any (private.notifications_consumers());
delete from public.message_jobs where channel = 'whatsapp' and status in ('scheduled', 'sending');

select tests.dispatch_requests() as before_requests \gset
select private.notifications_backstop();
select is(tests.dispatch_requests(), :before_requests,
  'Sin eventos ni trabajos vencidos, el respaldo no llama a la app');

insert into public.message_jobs (appointment_id, kind, offset_min, channel, template, send_at)
values ('a7000000-0000-0000-0000-000000000001', 'reminder', 30, 'whatsapp', 'recordatorio_2h', now() + interval '1 hour');
select private.notifications_backstop();
select is(tests.dispatch_requests(), :before_requests, 'Un trabajo futuro tampoco');

update public.message_jobs set send_at = now() - interval '1 second' where offset_min = 30;
select private.notifications_backstop();
select is(tests.dispatch_requests(), :before_requests + 1, 'Un trabajo vencido pide un despacho');

select * from finish();
rollback;
