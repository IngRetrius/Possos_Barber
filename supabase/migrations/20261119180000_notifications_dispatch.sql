-- Módulo notifications: despacho de booking_events y suscripciones push (F8).
--
-- Cómo se dispara (decisión de F8, ver docs/07):
-- 1. Cada transacción que publica en booking_events pide un despacho con pg_net: un POST a la
--    ruta /api/notifications/dispatch de la app. pg_net encola la petición dentro de la
--    transacción y la manda después del commit; si la reserva se deshace, no sale nada.
-- 2. pg_cron revisa cada minuto si algún consumidor quedó atrás y, solo entonces, pide otro
--    despacho. Cubre una petición perdida, la app caída y los huecos de abajo.
-- La URL y el secreto de la ruta viven en Supabase Vault (notifications_dispatch_url y
-- notifications_dispatch_secret), no en el repo. Sin ellos no se pide nada.
--
-- Cada consumidor (push en F8; whatsapp en F7) avanza su propio cursor en event_cursors con
-- claim_booking_events y ack_booking_events: entrega al menos una vez, en orden.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

-- Turno del consumidor: mientras lease_until no pase, otro despacho no toma eventos.
alter table public.event_cursors
  add column lease_until timestamptz,
  add column updated_at  timestamptz not null default now();

-- El consumidor push empieza en el último id que dio la secuencia: al aplicar la migración en
-- producción no se mandan avisos de citas viejas. Se toma de la secuencia y no de max(id)
-- porque una transacción deshecha también gasta ids, y el cursor se pararía 2 minutos ante ese
-- hueco (ver claim_booking_events).
insert into public.event_cursors (consumer, last_event_id)
values ('push', coalesce(pg_sequence_last_value('public.booking_events_id_seq'), 0))
on conflict (consumer) do nothing;

-- ---------------------------------------------------------------------------------------------
-- Cursor
-- ---------------------------------------------------------------------------------------------

-- Toma el turno del consumidor y devuelve los eventos después de su cursor, en orden.
-- Lanza BUSY si otro despacho tiene el turno; ese despacho, al soltarlo, vuelve a mirar si
-- quedan eventos (ack_booking_events), así que no se pierde nada. Quien sí tomó el turno
-- siempre termina con ack_booking_events, aunque no haya recibido eventos, para soltarlo.
--
-- Huecos: booking_events.id sale de una secuencia al insertar, pero las transacciones pueden
-- terminar en otro orden. Un id que falta puede ser una reserva que todavía no termina; si el
-- cursor lo saltara, ese evento se perdería. Por eso se para antes de un hueco reciente y solo
-- lo salta cuando el evento siguiente tiene más de 2 minutos (las funciones de la API terminan
-- en segundos: statement_timeout de 8 s). Un hueco viejo es una transacción que se deshizo.
create function public.claim_booking_events(p_consumer text, p_limit integer default 50)
returns setof public.booking_events
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_last     bigint;
  v_expected bigint;
  v_event    public.booking_events;
begin
  if p_consumer is null or p_consumer !~ '^[a-z][a-z0-9_]{0,30}$' then
    raise exception 'INVALID_INPUT';
  end if;

  insert into public.event_cursors (consumer) values (p_consumer)
  on conflict (consumer) do nothing;

  update public.event_cursors
  set lease_until = now() + interval '1 minute', updated_at = now()
  where consumer = p_consumer and (lease_until is null or lease_until <= now())
  returning last_event_id into v_last;
  if not found then
    raise exception 'BUSY';
  end if;

  v_expected := v_last + 1;
  for v_event in
    select * from public.booking_events e
    where e.id > v_last
    order by e.id
    limit greatest(coalesce(p_limit, 50), 1)
  loop
    if v_event.id <> v_expected and v_event.created_at > now() - interval '2 minutes' then
      exit;
    end if;
    return next v_event;
    v_expected := v_event.id + 1;
  end loop;
end;
$$;

-- Avanza el cursor hasta p_last_event_id (null: no avanza) y suelta el turno. Devuelve si
-- quedan eventos después del cursor, para que el despacho siga sin esperar al cron.
create function public.ack_booking_events(p_consumer text, p_last_event_id bigint default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_last bigint;
begin
  update public.event_cursors
  set last_event_id = greatest(last_event_id, coalesce(p_last_event_id, last_event_id)),
      lease_until = null,
      updated_at = now()
  where consumer = p_consumer
  returning last_event_id into v_last;
  if not found then
    return false;
  end if;
  return exists (select 1 from public.booking_events e where e.id > v_last);
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Pedir un despacho
-- ---------------------------------------------------------------------------------------------

-- Consumidores de booking_events. F7 agrega 'whatsapp' aquí (create or replace).
create function private.notifications_consumers()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['push']::text[];
$$;

-- POST a la ruta de despacho con el secreto de Vault. Nunca lanza: una falla aquí no puede
-- deshacer una reserva.
create function private.notifications_request_dispatch()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url    text;
  v_secret text;
begin
  select s.decrypted_secret into v_url
  from vault.decrypted_secrets s where s.name = 'notifications_dispatch_url';
  select s.decrypted_secret into v_secret
  from vault.decrypted_secrets s where s.name = 'notifications_dispatch_secret';
  if coalesce(v_url, '') = '' or coalesce(v_secret, '') = '' then
    return;
  end if;

  perform net.http_post(
    url := v_url,
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    timeout_milliseconds := 10000
  );
exception when others then
  raise warning 'notifications_request_dispatch: %', sqlerrm;
end;
$$;

-- Un aviso por transacción, no por cita: reprogramar escribe un solo evento, pero una función
-- futura podría escribir varios.
create function private.notifications_on_booking_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.notifications_request_dispatch();
  return null;
end;
$$;

-- El trigger es de notifications aunque esté sobre una tabla de booking: solo lee, como un
-- webhook de base de datos de Supabase. Sin notifications, booking funciona igual (docs/08).
create trigger booking_events_request_dispatch
  after insert on public.booking_events
  for each statement execute function private.notifications_on_booking_event();

-- Respaldo de pg_cron: pide un despacho si algún consumidor tiene eventos pendientes. Sin
-- pendientes no llama a la app (cero invocaciones con la barbería quieta). F7 agrega aquí los
-- message_jobs vencidos.
create function private.notifications_backstop()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from unnest(private.notifications_consumers()) as k (consumer)
    left join public.event_cursors c on c.consumer = k.consumer
    where exists (
      select 1 from public.booking_events e where e.id > coalesce(c.last_event_id, 0)
    )
  ) then
    perform private.notifications_request_dispatch();
  end if;
end;
$$;

select cron.schedule('notifications-dispatch', '* * * * *', 'select private.notifications_backstop()');

-- ---------------------------------------------------------------------------------------------
-- Push
-- ---------------------------------------------------------------------------------------------

-- Guarda la suscripción del navegador para la cuenta de la sesión. Solo un barbero recibe
-- avisos push (F8). Un mismo navegador tiene un solo endpoint: si ya estaba con otra cuenta
-- (otra persona ingresó en el mismo celular), pasa a la de ahora.
create function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if public.current_barber_id() is null then
    raise exception 'FORBIDDEN';
  end if;
  if p_endpoint is null or p_endpoint !~ '^https://' or length(p_endpoint) > 2048
     or coalesce(p_p256dh, '') = '' or length(p_p256dh) > 256
     or coalesce(p_auth, '') = '' or length(p_auth) > 256 then
    raise exception 'INVALID_INPUT';
  end if;

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values ((select auth.uid()), p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
  set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
      created_at = now();
end;
$$;

-- A quién mandar el aviso de una cita: las suscripciones de la cuenta del barbero, si sigue
-- activo y con el rol. Solo el servidor (service role).
create function public.list_push_targets(p_barber_id uuid)
returns table (endpoint text, p256dh text, auth text)
language sql
stable
security definer
set search_path = ''
as $$
  select ps.endpoint, ps.p256dh, ps.auth
  from public.barbers b
  join public.push_subscriptions ps on ps.user_id = b.user_id
  where b.id = p_barber_id
    and b.active
    and exists (
      select 1 from public.staff_roles r where r.user_id = b.user_id and r.role = 'barber'
    );
$$;

-- Permisos: por omisión Supabase deja ejecutar todo a anon y authenticated.
revoke all on function public.claim_booking_events(text, integer) from public, anon, authenticated;
revoke all on function public.ack_booking_events(text, bigint) from public, anon, authenticated;
revoke all on function public.save_push_subscription(text, text, text) from public, anon, authenticated;
revoke all on function public.list_push_targets(uuid) from public, anon, authenticated;
revoke all on function private.notifications_consumers() from public, anon, authenticated;
revoke all on function private.notifications_request_dispatch() from public, anon, authenticated;
revoke all on function private.notifications_on_booking_event() from public, anon, authenticated;
revoke all on function private.notifications_backstop() from public, anon, authenticated;

grant execute on function public.claim_booking_events(text, integer) to service_role;
grant execute on function public.ack_booking_events(text, bigint) to service_role;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;
grant execute on function public.list_push_targets(uuid) to service_role;
