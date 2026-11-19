-- Módulo notifications: tablas de recordatorios, mensajes entrantes y push (docs/09).
-- La lógica de despacho y el webhook son de F7; aquí solo están las tablas y su RLS.

create table public.notification_settings (
  id                   boolean primary key default true check (id),
  reminder_offsets_min integer[] not null default '{1440, 120}',
  send_confirmation    boolean not null default true,
  updated_at           timestamptz not null default now()
);

-- Recordatorios de 24 h y 2 h y confirmación inmediata (docs/03 y decisión 6 de docs/10).
insert into public.notification_settings default values;

create table public.message_jobs (
  id                  uuid primary key default gen_random_uuid(),
  appointment_id      uuid not null references public.appointments (id) on delete cascade,
  kind                text not null check (kind in ('confirmation', 'reminder', 'cancellation')),
  -- Minutos antes de la cita; 0 para los mensajes que no son recordatorio.
  offset_min          integer not null default 0 check (offset_min >= 0),
  channel             text not null check (channel in ('whatsapp', 'push')),
  send_at             timestamptz not null,
  status              text not null default 'scheduled'
    check (status in ('scheduled', 'sending', 'sent', 'delivered', 'read', 'failed', 'skipped')),
  provider_message_id text unique,
  attempts            integer not null default 0 check (attempts >= 0),
  last_error          text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (appointment_id, kind, offset_min, channel)
);

create index message_jobs_due on public.message_jobs (send_at) where status = 'scheduled';

create table public.inbound_messages (
  id                  uuid primary key default gen_random_uuid(),
  provider_message_id text not null unique,
  from_phone          text,
  button_payload      text,
  appointment_id      uuid references public.appointments (id) on delete set null,
  payload             jsonb not null,
  received_at         timestamptz not null default now()
);

create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

create table public.event_cursors (
  consumer      text primary key,
  last_event_id bigint not null default 0
);

comment on table public.message_jobs is 'Módulo notifications. Solo el servidor escribe.';

-- RLS

alter table public.notification_settings enable row level security;
alter table public.message_jobs enable row level security;
alter table public.inbound_messages enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.event_cursors enable row level security;

create policy notification_settings_select on public.notification_settings
  for select to authenticated
  using (true);

create policy notification_settings_admin_update on public.notification_settings
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke all on public.notification_settings from anon;
revoke insert, delete on public.notification_settings from authenticated;

-- El barbero ve los mensajes de las citas de su agenda; el admin, todos.
create policy message_jobs_select on public.message_jobs
  for select to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.appointments a
      where a.id = message_jobs.appointment_id
        and a.barber_id = (select public.current_barber_id())
    )
  );

revoke all on public.message_jobs from anon;
revoke insert, update, delete on public.message_jobs from authenticated;

create policy push_subscriptions_own on public.push_subscriptions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.push_subscriptions from anon;

-- inbound_messages y event_cursors: sin políticas. Solo el servidor (service_role).
revoke all on public.inbound_messages, public.event_cursors from anon, authenticated;
