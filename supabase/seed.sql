-- Datos de desarrollo local. `pnpm db:reset` los carga después de las migraciones.
-- No se aplican en producción: allá los datos reales llegan en F9 y el primer administrador
-- se crea con el script de F3.
--
-- Cuentas para iniciar sesión en local (contraseña de todas: possos-local):
--   barbero@ejemplo.test   administrador y barbero ("Barbero de prueba")
--   barbero2@ejemplo.test  barbero sin rol de administrador e inactivo (matriz de docs/06, F6).
--                          Inactivo para que el flujo de reserva siga con un solo barbero
--   cliente@ejemplo.test   cliente con perfil completo
--   cliente2@ejemplo.test  otro cliente con perfil completo (pruebas de la hora tomada, F4)
--   aprobacion@ejemplo.test cliente con 2 inasistencias: sus reservas esperan aprobación
-- Además hay un cliente sin cuenta, como los que crea el personal.

-- Usuarios de Supabase Auth con correo y contraseña ya confirmados.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
       extensions.crypt('possos-local', extensions.gen_salt('bf')), now(),
       '{"provider": "email", "providers": ["email"]}', '{}', now(), now(),
       '', '', '', '', '', '', '', ''
from (values
  ('5eed0000-0000-0000-0000-000000000001'::uuid, 'barbero@ejemplo.test'),
  ('5eed0000-0000-0000-0000-000000000002'::uuid, 'cliente@ejemplo.test'),
  ('5eed0000-0000-0000-0000-000000000003'::uuid, 'cliente2@ejemplo.test'),
  ('5eed0000-0000-0000-0000-000000000004'::uuid, 'aprobacion@ejemplo.test'),
  ('5eed0000-0000-0000-0000-000000000005'::uuid, 'barbero2@ejemplo.test')
) as u (id, email);

insert into auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at, last_sign_in_at)
select gen_random_uuid(), u.id, u.id::text, 'email',
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       now(), now(), now()
from auth.users u
where u.email like '%@ejemplo.test';

-- El barbero administrador (hoy el dueño es administrador y barbero, docs/06).
insert into public.staff_roles (user_id, role) values
  ('5eed0000-0000-0000-0000-000000000001', 'admin'),
  ('5eed0000-0000-0000-0000-000000000001', 'barber');

insert into public.barbers (id, user_id, display_name) values
  ('5eedba00-0000-0000-0000-000000000001', '5eed0000-0000-0000-0000-000000000001', 'Barbero de prueba');

-- Segundo barbero, sin rol de administrador. Inactivo: no aparece en la reserva del cliente ni
-- en "cualquiera disponible", pero entra al panel y ve solo lo suyo (docs/06).
insert into public.staff_roles (user_id, role) values
  ('5eed0000-0000-0000-0000-000000000005', 'barber');

insert into public.barbers (id, user_id, display_name, active) values
  ('5eedba00-0000-0000-0000-000000000002', '5eed0000-0000-0000-0000-000000000005', 'Barbero dos de prueba', false);

-- Servicio confirmado por el dueño: corte normal de 60 min. Precio [PENDIENTE]: null.
insert into public.services (id, name, duration_min, price_cop, sort_order) values
  ('5eed5e00-0000-0000-0000-000000000001', 'Corte normal', 60, null, 1);

insert into public.barber_services (barber_id, service_id) values
  ('5eedba00-0000-0000-0000-000000000001', '5eed5e00-0000-0000-0000-000000000001');

-- Porcentaje del barbero: 50 % (dueño, 19/11/2026).
insert into public.commission_rates (barber_id, barber_pct) values
  ('5eedba00-0000-0000-0000-000000000001', 50),
  ('5eedba00-0000-0000-0000-000000000002', 50);

-- HORARIO DE EJEMPLO, no es el real: el horario de atención sigue [PENDIENTE] (decisión 3 de
-- docs/10). Lunes a sábado de 9:00 a 12:00 y de 14:00 a 19:00, como el ejemplo de docs/04.
insert into public.working_hours (barber_id, weekday, start_time, end_time)
select '5eedba00-0000-0000-0000-000000000001', d, r.start_time, r.end_time
from generate_series(1, 6) d
cross join (values ('09:00'::time, '12:00'::time), ('14:00'::time, '19:00'::time)) as r (start_time, end_time);

-- Clientes de prueba: uno con cuenta y uno sin cuenta, creado por el personal.
-- La versión de la política es DATA_POLICY_VERSION de @possos/customers; si no coincide, la app
-- le pide al cliente que vuelva a autorizar el tratamiento de datos al ingresar.
insert into public.customers
  (id, user_id, full_name, phone, email, whatsapp_opt_in, data_consent_at, data_policy_version, created_by) values
  ('5eedc000-0000-0000-0000-000000000001', '5eed0000-0000-0000-0000-000000000002',
   'Cliente de prueba', '+573000000001', 'cliente@ejemplo.test', true, now(), 'borrador-2026-11-19',
   '5eed0000-0000-0000-0000-000000000002'),
  ('5eedc000-0000-0000-0000-000000000002', null,
   'Cliente sin cuenta', '+573000000002', null, true, null, null,
   '5eed0000-0000-0000-0000-000000000001'),
  ('5eedc000-0000-0000-0000-000000000003', '5eed0000-0000-0000-0000-000000000003',
   'Cliente dos de prueba', '+573000000003', 'cliente2@ejemplo.test', false, now(), 'borrador-2026-11-19',
   '5eed0000-0000-0000-0000-000000000003'),
  ('5eedc000-0000-0000-0000-000000000004', '5eed0000-0000-0000-0000-000000000004',
   'Cliente con aprobación', '+573000000004', 'aprobacion@ejemplo.test', true, now(), 'borrador-2026-11-19',
   '5eed0000-0000-0000-0000-000000000004');

-- Dos inasistencias: sus reservas en línea entran como pending_approval (docs/04).
insert into public.customer_booking_status (customer_id, no_show_count, requires_approval) values
  ('5eedc000-0000-0000-0000-000000000004', 2, true);

insert into public.barber_customers (barber_id, customer_id) values
  ('5eedba00-0000-0000-0000-000000000001', '5eedc000-0000-0000-0000-000000000001'),
  ('5eedba00-0000-0000-0000-000000000001', '5eedc000-0000-0000-0000-000000000002');
