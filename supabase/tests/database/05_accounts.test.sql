-- F3: perfil del cliente, autorización de datos (Ley 1581) y borrar la cuenta.
begin;
\ir ../fixtures/setup.psql
select plan(26);

-- ---------------------------------------------------------------------------------------------
-- Roles: nadie se asigna un rol a sí mismo (03_rls cubre al usuario sin rol y al barbero)
-- ---------------------------------------------------------------------------------------------
select tests.login('c0000000-0000-0000-0000-000000000001');
select throws_ok(
  $$ insert into public.staff_roles (user_id, role) values ('c0000000-0000-0000-0000-000000000001', 'barber') $$,
  '42501', null,
  'Un cliente no puede darse el rol de barbero'
);
reset role;

-- ---------------------------------------------------------------------------------------------
-- Completar el perfil
-- ---------------------------------------------------------------------------------------------
select tests.login('d0000000-0000-0000-0000-000000000001');

select throws_ok(
  $$ insert into public.customers (user_id, full_name, phone) values
       ('d0000000-0000-0000-0000-000000000001', 'Sin Permiso', '+573001112233') $$,
  '23514', null,
  'Sin autorización de datos no se guarda el perfil'
);

select throws_ok(
  $$ insert into public.customers (user_id, full_name, data_policy_version) values
       ('d0000000-0000-0000-0000-000000000001', 'Sin Celular', 'prueba') $$,
  '23514', null,
  'Sin celular no se guarda el perfil'
);

select throws_ok(
  $$ insert into public.customers (user_id, full_name, phone, data_policy_version) values
       ('d0000000-0000-0000-0000-000000000001', 'Celular Malo', '3001112233', 'prueba') $$,
  '23514', null,
  'Un celular sin +57 se rechaza'
);

select throws_ok(
  $$ insert into public.customers (user_id, full_name, phone, data_policy_version) values
       ('c0000000-0000-0000-0000-000000000002', 'Otra Persona', '+573001112233', 'prueba') $$,
  '42501', null,
  'Nadie crea el perfil de otra cuenta'
);

-- La app manda una hora vieja; la base pone la de ahora.
select lives_ok(
  $$ insert into public.customers
       (user_id, full_name, phone, whatsapp_opt_in, data_consent_at, data_policy_version) values
       ('d0000000-0000-0000-0000-000000000001', 'Persona Nueva', '+573001112233', false,
        '2000-01-01', 'prueba') $$,
  'Con celular y autorización, el perfil se guarda'
);

select ok(
  (select data_consent_at > now() - interval '1 minute'
   from public.customers where user_id = 'd0000000-0000-0000-0000-000000000001'),
  'La hora de la autorización la pone la base'
);

-- Cambiar el nombre o el WhatsApp no cambia la hora de la autorización.
update public.customers set data_consent_at = '2000-01-01', whatsapp_opt_in = true
where user_id = 'd0000000-0000-0000-0000-000000000001';

select ok(
  (select data_consent_at > now() - interval '1 minute' and whatsapp_opt_in
   from public.customers where user_id = 'd0000000-0000-0000-0000-000000000001'),
  'Editar el perfil no mueve la hora de la autorización'
);

select throws_ok(
  $$ update public.customers set user_id = 'c0000000-0000-0000-0000-000000000002'
     where user_id = 'd0000000-0000-0000-0000-000000000001' $$,
  '42501', null,
  'El cliente no cambia el user_id de su perfil'
);

select throws_ok(
  $$ update public.customers set data_policy_version = null
     where user_id = 'd0000000-0000-0000-0000-000000000001' $$,
  '23514', null,
  'El cliente no puede quitar la autorización y quedarse con la cuenta'
);
reset role;

-- La autorización de una versión nueva de la política sí actualiza la hora.
-- (Sin el JWT de la persona, para que el trigger no tome el update como suyo).
select set_config('request.jwt.claims', '', true);
update public.customers set data_consent_at = '2000-01-01'
where user_id = 'd0000000-0000-0000-0000-000000000001';
select tests.login('d0000000-0000-0000-0000-000000000001');
update public.customers set data_policy_version = 'prueba-2'
where user_id = 'd0000000-0000-0000-0000-000000000001';
reset role;

select ok(
  (select data_consent_at > now() - interval '1 minute'
   from public.customers where user_id = 'd0000000-0000-0000-0000-000000000001'),
  'Aceptar una versión nueva de la política registra la hora de ahora'
);

-- El personal escribe clientes sin cuenta sin que la base invente una autorización.
select tests.login('a0000000-0000-0000-0000-000000000001');
select public.staff_create_customer('Walk In', '+573005556677', null, true);
reset role;
select ok(
  (select data_consent_at is null from public.customers where full_name = 'Walk In'),
  'Un cliente creado por el personal no recibe una autorización automática'
);

-- ---------------------------------------------------------------------------------------------
-- Borrar la cuenta
-- ---------------------------------------------------------------------------------------------
select ok(
  not has_function_privilege('anon', 'public.delete_my_account()', 'execute'),
  'anon no puede ejecutar delete_my_account'
);
select ok(
  has_function_privilege('authenticated', 'public.delete_my_account()', 'execute'),
  'authenticated puede ejecutar delete_my_account'
);

-- Datos del cliente 1: una cita pasada con A, una nota de A y su relación con A.
insert into public.appointments (id, barber_id, customer_id, service_id, period, source, status) values
  ('ad000000-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001',
   tstzrange(tests.at(-2, '10:00'), tests.at(-2, '11:00'), '[)'), 'customer', 'completed');
select public.link_customer_to_barber('c1000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001');
insert into public.customer_notes (customer_id, barber_id, body) values
  ('c1000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Nota sobre Uno');

-- El personal no se borra desde aquí.
select tests.login('a0000000-0000-0000-0000-000000000001');
select throws_ok(
  $$ select public.delete_my_account() $$,
  'P0001', 'FORBIDDEN',
  'El administrador no puede borrar su cuenta desde la app'
);
reset role;
select tests.login('b0000000-0000-0000-0000-000000000001');
select throws_ok(
  $$ select public.delete_my_account() $$,
  'P0001', 'FORBIDDEN',
  'Un barbero no puede borrar su cuenta desde la app'
);
reset role;

select tests.login('c0000000-0000-0000-0000-000000000001');
select lives_ok($$ select public.delete_my_account() $$, 'El cliente borra su cuenta');
reset role;

select is_empty(
  $$ select 1 from auth.users where id = 'c0000000-0000-0000-0000-000000000001' $$,
  'El usuario de Auth ya no existe'
);

select results_eq(
  $$ select user_id, full_name, phone, email, whatsapp_opt_in, data_consent_at, data_policy_version
     from public.customers where id = 'c1000000-0000-0000-0000-000000000001' $$,
  $$ values (null::uuid, 'Cuenta borrada'::text, null::text, null::text, false, null::timestamptz, null::text) $$,
  'El perfil queda sin nombre, celular, correo ni autorizaciones'
);

select is_empty(
  $$ select 1 from public.customer_notes where customer_id = 'c1000000-0000-0000-0000-000000000001' $$,
  'Las notas del barbero sobre esa persona se borran'
);

select isnt_empty(
  $$ select 1 from public.appointments where id = 'ad000000-0000-0000-0000-000000000005' $$,
  'Las citas pasadas se conservan para la agenda y la liquidación'
);

select isnt_empty(
  $$ select 1 from public.barbers where id = 'aaaaaaaa-0000-0000-0000-000000000001' and user_id is not null $$,
  'El barbero no se ve afectado'
);

-- Sin sesión no se borra nada.
select set_config('request.jwt.claims', '{"role": "authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$ select public.delete_my_account() $$,
  'P0001', 'NOT_AUTHENTICATED',
  'Sin usuario en el JWT, delete_my_account no hace nada'
);
reset role;

-- El cliente 2 sigue intacto.
select results_eq(
  $$ select full_name from public.customers where id = 'c2000000-0000-0000-0000-000000000001' $$,
  $$ values ('Cliente Dos'::text) $$,
  'Los demás clientes no cambian'
);

-- Las funciones nuevas no quedan abiertas a anon.
select ok(
  not has_schema_privilege('anon', 'private', 'usage')
    and not has_schema_privilege('authenticated', 'private', 'usage'),
  'Las funciones internas de customers siguen fuera del alcance de la app'
);

-- Borrar desde el panel de Supabase (supabase_auth_admin) también anonimiza.
delete from auth.users where id = 'c0000000-0000-0000-0000-000000000002';
select results_eq(
  $$ select full_name, phone from public.customers where id = 'c2000000-0000-0000-0000-000000000001' $$,
  $$ values ('Cuenta borrada'::text, null::text) $$,
  'Borrar el usuario fuera de la app también deja el perfil sin datos'
);

select * from finish();
rollback;
