-- Módulo booking: la cita de un celular, para el WhatsApp (F7).
--
-- Cuando un cliente escribe texto libre al número de los recordatorios, notifications contesta
-- con el WhatsApp del barbero de su cita. El mensaje solo trae el celular: esta función devuelve
-- la próxima cita activa de ese celular o, si no tiene, la última. Solo el servidor (service
-- role), igual que get_appointment_for_notification; nunca la sesión de un cliente.

create function public.find_appointment_for_phone(p_phone text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select a.id
  from public.customers c
  join public.appointments a on a.customer_id = c.id
  where p_phone ~ '^\+57[0-9]{10}$'
    and c.phone = p_phone
  order by
    (a.status in ('pending_approval', 'booked', 'confirmed') and upper(a.period) > now()) desc,
    case
      when a.status in ('pending_approval', 'booked', 'confirmed') and upper(a.period) > now()
        then lower(a.period)
    end asc,
    lower(a.period) desc
  limit 1;
$$;

revoke all on function public.find_appointment_for_phone(text) from public, anon, authenticated;
grant execute on function public.find_appointment_for_phone(text) to service_role;
