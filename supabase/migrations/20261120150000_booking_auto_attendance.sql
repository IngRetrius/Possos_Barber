-- Asistencia por omisión (20/11/2026, pedido de Juan; docs/04, "Inasistencias").
--
-- Antes, pasada la hora, el barbero marcaba "Vino" o "No vino", y lo que no marcaba quedaba
-- "por cerrar". Ahora la cita que termina sin marca cuenta como atendida: pg_cron la pasa a
-- completed cada minuto (private.booking_close_past). El barbero solo marca "No vino", desde la
-- hora de inicio y también sobre una cita que ya se cerró: el barbero, el mismo día de la cita;
-- el administrador, siempre.
--
-- El cobro de las citas cerradas y su anulación cuando pasan a no_show son de commissions, que
-- escucha booking_events (20261120150100_commissions_auto_charges.sql). booking no conoce sus
-- tablas (regla 2 de docs/08).

-- Las citas abiertas por su hora de fin: lo que recorre el cierre cada minuto.
create index appointments_open_by_end on public.appointments (upper(period))
  where status in ('booked', 'confirmed');

-- Vino o no vino. Solo después de la hora de inicio. "No vino" también vale sobre una cita
-- completed (se cerró sola al terminar): el barbero, el mismo día de la cita; el administrador,
-- siempre. Cada inasistencia suma 1; al llegar a no_show_threshold, las reservas del cliente
-- necesitan aprobación (docs/04).
create or replace function public.mark_attendance(p_id uuid, p_attended boolean)
returns public.appointments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cfg public.booking_settings;
  v_row public.appointments;
begin
  if (select auth.uid()) is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if p_attended is null then
    raise exception 'INVALID_INPUT';
  end if;

  select * into v_row from public.appointments where id = p_id for update;
  if not found or not private.booking_is_staff_for(v_row.barber_id) then
    raise exception 'NOT_FOUND';
  end if;
  select * into v_cfg from public.booking_settings where id;

  if v_row.status = 'completed' and not p_attended then
    if not coalesce(public.is_admin(), false)
       and (lower(v_row.period) at time zone v_cfg.timezone)::date
           <> (now() at time zone v_cfg.timezone)::date then
      raise exception 'INVALID_STATUS';
    end if;
  elsif v_row.status not in ('booked', 'confirmed') then
    raise exception 'INVALID_STATUS';
  end if;
  if lower(v_row.period) > now() then
    raise exception 'NOT_STARTED';
  end if;

  update public.appointments
  set status = case when p_attended then 'completed'::public.appointment_status
                    else 'no_show'::public.appointment_status end
  where id = p_id
  returning * into v_row;

  if not p_attended then
    insert into public.customer_booking_status as s (customer_id, no_show_count, requires_approval)
    values (v_row.customer_id, 1, 1 >= v_cfg.no_show_threshold)
    on conflict (customer_id) do update
    set no_show_count = s.no_show_count + 1,
        requires_approval = s.requires_approval or s.no_show_count + 1 >= v_cfg.no_show_threshold,
        updated_at = now();
  end if;

  return v_row;
end;
$$;

-- Cierra las citas que terminaron sin marca: cuentan como atendidas. La corre pg_cron cada
-- minuto. Cada cierre publica appointment.status_changed (completed) en booking_events.
create function private.booking_close_past()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.appointments
  set status = 'completed'
  where status in ('booked', 'confirmed') and upper(period) <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function private.booking_close_past() from public, anon, authenticated;

select cron.schedule('booking-close-past', '* * * * *', 'select private.booking_close_past()');
