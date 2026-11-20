-- Módulo notifications: recordatorios por WhatsApp con la Cloud API de Meta (F7).
--
-- Cómo funciona (fases/F7-entrega.md, docs/03):
-- 1. El consumidor `whatsapp` de booking_events (el mismo despacho de F8) crea los message_jobs
--    de cada cita y pasa a `skipped` los pendientes cuando la cita se cancela o se mueve.
-- 2. La ruta de despacho toma los trabajos vencidos con claim_message_jobs (for update skip
--    locked: dos despachos a la vez nunca toman el mismo) y los manda por HTTP.
-- 3. El webhook de Meta registra los estados con record_message_status.
-- 4. pg_cron pide un despacho cada minuto solo si hay trabajos vencidos o eventos pendientes.
--
-- No toca appointments ni su restricción de exclusión.

-- ---------------------------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------------------------

alter table public.message_jobs
  -- Plantilla de Meta que se manda (cita_confirmada, recordatorio_24h, recordatorio_2h,
  -- cita_cancelada). La decide el consumidor al crear el trabajo; null en push.
  add column template         text check (template is null or (template ~ '^[a-z0-9_]+$' and length(template) <= 512)),
  -- Cuando la Cloud API aceptó el mensaje. El costo del mes se cuenta con esta fecha.
  add column sent_at          timestamptz,
  -- Hora del último estado que llegó por el webhook.
  add column status_at        timestamptz,
  -- Categoría con que Meta cobró el mensaje (utility, marketing, ...), del webhook. Si una
  -- plantilla aparece como marketing, Meta la reclasificó (riesgo 1 de docs/10).
  add column pricing_category text check (pricing_category is null or length(pricing_category) <= 40);

create index message_jobs_sending on public.message_jobs (updated_at) where status = 'sending';
create index message_jobs_sent_at on public.message_jobs (sent_at) where sent_at is not null;

-- Aviso al cliente cuando el personal cancela su cita (decisión 7 de docs/10). Apagado hasta que
-- el dueño apruebe el texto y Meta apruebe la plantilla cita_cancelada.
alter table public.notification_settings
  add column send_cancellation boolean not null default false;

-- Para no contestar dos veces seguidas un texto libre del mismo celular.
create index inbound_messages_from_phone on public.inbound_messages (from_phone, received_at);

-- ---------------------------------------------------------------------------------------------
-- Consumidor whatsapp de booking_events
-- ---------------------------------------------------------------------------------------------

-- Empieza en el último id que dio la secuencia: al aplicar la migración en producción no se
-- programan mensajes de citas viejas (ver la migración de F8).
insert into public.event_cursors (consumer, last_event_id)
values ('whatsapp', coalesce(pg_sequence_last_value('public.booking_events_id_seq'), 0))
on conflict (consumer) do nothing;

create or replace function private.notifications_consumers()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['push', 'whatsapp']::text[];
$$;

-- ---------------------------------------------------------------------------------------------
-- Despacho de message_jobs
-- ---------------------------------------------------------------------------------------------

-- Un trabajo en `sending` por más de 5 minutos quedó de un despacho que se cayó (la ruta tiene
-- 60 s como máximo): se vuelve a tomar. Ver fases/F7-entrega.md.
create function private.notifications_job_is_due(p_status text, p_send_at timestamptz, p_updated_at timestamptz)
returns boolean
language sql
stable
set search_path = ''
as $$
  select (p_status = 'scheduled' and p_send_at <= now())
      or (p_status = 'sending' and p_updated_at < now() - interval '5 minutes');
$$;

-- Toma los trabajos de WhatsApp vencidos y los pasa a `sending`, sumando un intento. Con for
-- update skip locked, dos despachos a la vez se reparten los trabajos y ninguno sale dos veces:
-- el segundo salta las filas que el primero tiene bloqueadas y, después del commit, ya no las ve
-- como `scheduled`.
create function public.claim_message_jobs(p_limit integer default 10)
returns setof public.message_jobs
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with due as (
    select m.id
    from public.message_jobs m
    where m.channel = 'whatsapp'
      and private.notifications_job_is_due(m.status, m.send_at, m.updated_at)
    order by m.send_at, m.id
    limit least(greatest(coalesce(p_limit, 10), 1), 50)
    for update skip locked
  )
  update public.message_jobs m
  set status = 'sending', attempts = m.attempts + 1, updated_at = now()
  from due
  where m.id = due.id
  returning m.*;
end;
$$;

-- Termina un trabajo que este despacho tomó. Solo cambia filas en `sending` (si otro despacho lo
-- volvió a tomar por vencido, el que llegue tarde no lo pisa). Devuelve si cambió la fila.
-- p_outcome: 'sent' (con p_provider_message_id), 'retry' (vuelve a `scheduled` en p_retry_at),
-- 'failed' o 'skipped' (con el motivo en p_error).
create function public.finish_message_job(
  p_id                  uuid,
  p_outcome             text,
  p_provider_message_id text default null,
  p_error               text default null,
  p_retry_at            timestamptz default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_outcome is null or p_outcome not in ('sent', 'retry', 'failed', 'skipped')
     or (p_outcome = 'sent' and coalesce(p_provider_message_id, '') = '')
     or (p_outcome = 'retry' and p_retry_at is null) then
    raise exception 'INVALID_INPUT';
  end if;

  update public.message_jobs
  set status = case p_outcome when 'retry' then 'scheduled' else p_outcome end,
      provider_message_id = case when p_outcome = 'sent' then p_provider_message_id else provider_message_id end,
      sent_at = case when p_outcome = 'sent' then now() else sent_at end,
      send_at = case when p_outcome = 'retry' then p_retry_at else send_at end,
      last_error = case when p_outcome = 'sent' then null else left(p_error, 500) end,
      updated_at = now()
  where id = p_id and status = 'sending';
  return found;
end;
$$;

-- Estado de un mensaje que llega por el webhook. Los estados solo avanzan: Meta puede mandar
-- `read` antes que `delivered`, o repetir uno. `failed` solo cuenta si el mensaje no se había
-- entregado. Devuelve la cita del mensaje, o null si el mensaje no es un trabajo (por ejemplo,
-- una respuesta de servicio).
create function public.record_message_status(
  p_provider_message_id text,
  p_status              text,
  p_at                  timestamptz default null,
  p_error               text default null,
  p_pricing_category    text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.message_jobs;
begin
  if coalesce(p_provider_message_id, '') = ''
     or p_status is null or p_status not in ('sent', 'delivered', 'read', 'failed') then
    raise exception 'INVALID_INPUT';
  end if;

  select * into v_job from public.message_jobs
  where provider_message_id = p_provider_message_id
  for update;
  if not found then
    return null;
  end if;

  if (p_status = 'sent' and v_job.status = 'sending')
     or (p_status = 'failed' and v_job.status in ('sending', 'sent'))
     or (p_status = 'delivered' and v_job.status in ('sending', 'sent', 'failed'))
     or (p_status = 'read' and v_job.status in ('sending', 'sent', 'delivered', 'failed')) then
    update public.message_jobs
    set status = p_status,
        status_at = coalesce(p_at, now()),
        last_error = case when p_status = 'failed' then left(p_error, 500) else null end,
        pricing_category = coalesce(left(p_pricing_category, 40), pricing_category),
        updated_at = now()
    where id = v_job.id;
  elsif p_pricing_category is not null then
    update public.message_jobs
    set pricing_category = left(p_pricing_category, 40), updated_at = now()
    where id = v_job.id;
  end if;

  return v_job.appointment_id;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Respaldo de pg_cron
-- ---------------------------------------------------------------------------------------------

-- Además de los consumidores atrasados (F8), pide un despacho si hay trabajos de WhatsApp
-- vencidos. Así un recordatorio sale con un desfase de 1 minuto como máximo, sin Vercel Cron. Sin
-- nada pendiente no llama a la app.
create or replace function private.notifications_backstop()
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
  ) or exists (
    select 1 from public.message_jobs m
    where m.channel = 'whatsapp'
      and m.status in ('scheduled', 'sending')
      and private.notifications_job_is_due(m.status, m.send_at, m.updated_at)
  ) then
    perform private.notifications_request_dispatch();
  end if;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Permisos: por omisión Supabase deja ejecutar todo a anon y authenticated.
-- ---------------------------------------------------------------------------------------------

revoke all on function private.notifications_job_is_due(text, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.claim_message_jobs(integer) from public, anon, authenticated;
revoke all on function public.finish_message_job(uuid, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.record_message_status(text, text, timestamptz, text, text) from public, anon, authenticated;

grant execute on function public.claim_message_jobs(integer) to service_role;
grant execute on function public.finish_message_job(uuid, text, text, text, timestamptz) to service_role;
grant execute on function public.record_message_status(text, text, timestamptz, text, text) to service_role;
