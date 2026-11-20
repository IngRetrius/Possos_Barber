-- Módulo booking: "Mis citas" del cliente (F5).
--
-- list_my_appointments: las citas del cliente de la sesión, con lo que la pantalla necesita y el
-- cliente no puede leer por RLS:
--
-- - El nombre del servicio y del barbero aunque estén inactivos (services y barbers solo dejan
--   ver los activos), para que el historial no pierda nombres.
-- - El enlace de WhatsApp del barbero, para "Escríbele al barbero" pasado el límite.
-- - change_deadline: hasta cuándo puede cancelar o cambiar la cita. La política (cancel_window_min)
--   sigue decidiéndola la base: la interfaz solo esconde los botones, y cancel_appointment y
--   reschedule_appointment vuelven a revisar con TOO_LATE_TO_CANCEL.
-- - replaced_by: la cita que la reemplazó al reprogramarla. Los enlaces de los WhatsApp (F7)
--   apuntan a un id; si la cita se movió, la pantalla lleva a la nueva.
--
-- Solo devuelve citas cuyo cliente es el de la sesión: nunca datos de otro cliente (regla 7).
-- Sin p_id, deja fuera las reprogramadas (las reemplaza la nueva) y devuelve las más nuevas
-- primero, hasta p_limit (máximo 200).

create function public.list_my_appointments(
  p_id    uuid default null,
  p_limit integer default 50
)
returns table (
  id                  uuid,
  status              public.appointment_status,
  start_at            timestamptz,
  end_at              timestamptz,
  service_id          uuid,
  service_name        text,
  service_active      boolean,
  barber_id           uuid,
  barber_name         text,
  barber_active       boolean,
  barber_whatsapp_url text,
  price_cop           integer,
  change_deadline     timestamptz,
  replaced_by         uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id,
         a.status,
         lower(a.period),
         upper(a.period),
         a.service_id,
         s.name,
         s.active,
         a.barber_id,
         b.display_name,
         b.active,
         b.whatsapp_url,
         a.price_cop,
         lower(a.period) - make_interval(mins => cfg.cancel_window_min),
         r.id
  from public.appointments a
  join public.customers c on c.id = a.customer_id
  join public.services s on s.id = a.service_id
  join public.barbers b on b.id = a.barber_id
  cross join public.booking_settings cfg
  left join lateral (
    select n.id
    from public.appointments n
    where n.rescheduled_from = a.id
    order by n.created_at desc
    limit 1
  ) r on true
  where c.user_id = (select auth.uid())
    and cfg.id
    and (p_id is null or a.id = p_id)
    and (p_id is not null or r.id is null)
  order by lower(a.period) desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
$$;

revoke all on function public.list_my_appointments(uuid, integer) from public, anon, authenticated;
grant execute on function public.list_my_appointments(uuid, integer) to authenticated;
