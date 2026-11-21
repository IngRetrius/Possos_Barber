-- Cobro automático (20/11/2026, pedido de Juan; docs/04, "Inasistencias").
--
-- La cita que termina sin marca se cierra sola como completed (booking). En la misma
-- transacción, commissions la cobra con el precio de la reserva y el porcentaje vigente, con la
-- hora de fin de la cita como charged_at: cuenta en la liquidación de ese día y el barbero lo
-- corrige ese mismo día con update_charge. Si después el barbero marca "No vino", el cobro se
-- anula con el motivo "No vino" (no se borra).
--
-- No se cobra sin precio ([PENDIENTE]), sin porcentaje ni si la cita terminó hace más de 3 días
-- (por ejemplo, citas viejas que se cierran al aplicar esta migración): esas quedan en "Cobros
-- por registrar" del panel, para registrarlas a mano como antes.

-- Cobra o anula el cobro de una cita según su estado. Lee la cita con private.booking_appointment
-- (API de booking). Cobrar dos veces no hace nada: un cobro por cita.
create function private.commissions_sync_appointment(p_appointment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_appt record;
begin
  select * into v_appt from private.booking_appointment(p_appointment_id);
  if not found then
    return;
  end if;

  if v_appt.status = 'completed' then
    insert into public.charges (appointment_id, barber_id, service_id, amount_cop, barber_pct, charged_at)
    select v_appt.id, v_appt.barber_id, v_appt.service_id, v_appt.price_cop, r.barber_pct, v_appt.end_at
    from public.commission_rates r
    where r.barber_id = v_appt.barber_id
      and v_appt.price_cop is not null
      and v_appt.end_at >= now() - interval '3 days'
    on conflict (appointment_id) do nothing;
  elsif v_appt.status = 'no_show' then
    update public.charges
    set voided_at = now(), void_reason = 'No vino', updated_at = now()
    where appointment_id = p_appointment_id and voided_at is null;
  end if;
end;
$$;

-- Consumidor de booking_events, como el de notifications: el trigger es de commissions aunque
-- esté sobre una tabla de booking, y solo lee. Un error aquí no hace fallar el cierre ni "No
-- vino": queda un aviso en el registro y la cita aparece sin cobro en el panel.
create function private.commissions_on_booking_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.commissions_sync_appointment(new.appointment_id);
  return null;
exception when others then
  raise warning 'commissions_on_booking_event: %', sqlerrm;
  return null;
end;
$$;

create trigger booking_events_commissions
  after insert on public.booking_events
  for each row
  when (new.type = 'appointment.status_changed'
        and new.payload ->> 'status' in ('completed', 'no_show'))
  execute function private.commissions_on_booking_event();

revoke all on function private.commissions_sync_appointment(uuid) from public, anon, authenticated;
revoke all on function private.commissions_on_booking_event() from public, anon, authenticated;
