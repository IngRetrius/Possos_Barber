-- Módulo booking: la agenda del panel en vivo (F6).
--
-- El panel del barbero escucha Postgres Changes sobre appointments, filtrado por barber_id.
-- Realtime aplica RLS a cada suscriptor: el barbero recibe solo las filas de su agenda, el
-- administrador todas y un cliente solo las suyas (appointments_select). Las filas no traen
-- nombres ni celulares: el panel vuelve a pedir la agenda al servidor con cada aviso.
--
-- Las horas libres del cliente siguen por Broadcast (slots:<barber_id>:<fecha>), sin datos de
-- nadie: un cliente sin sesión no puede usar Postgres Changes.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'appointments'
  ) then
    alter publication supabase_realtime add table public.appointments;
  end if;
end;
$$;
