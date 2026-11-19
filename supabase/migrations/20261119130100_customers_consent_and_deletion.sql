-- Módulo customers: hora de la autorización y perfil de una cuenta borrada (F3, Ley 1581).

-- 1. La hora de la autorización la pone la base, no el navegador.
--
-- Cuando el cliente guarda su propio perfil con una versión de la política distinta de la que
-- tenía (o lo crea), data_consent_at pasa a now(). Así la prueba de la autorización no depende
-- de lo que mande la app. Lo que escribe el personal (clientes sin cuenta) no se toca: esa
-- autorización la dio el cliente de palabra y la registra quien crea la cita (F6).
create function private.customers_stamp_consent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is null or new.user_id is distinct from (select auth.uid()) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.data_consent_at := case when new.data_policy_version is null then null else now() end;
  elsif new.data_policy_version is distinct from old.data_policy_version then
    new.data_consent_at := case when new.data_policy_version is null then null else now() end;
  else
    new.data_consent_at := old.data_consent_at;
  end if;
  return new;
end;
$$;

create trigger customers_stamp_consent
  before insert or update on public.customers
  for each row execute function private.customers_stamp_consent();

-- 2. Cuenta borrada: el perfil queda sin datos personales.
--
-- Al borrar el usuario de Auth (delete_my_account del módulo auth), la clave foránea pone
-- customers.user_id en null. El perfil no se borra porque las citas y los cobros pasados lo
-- referencian (la liquidación del barbero debe seguir cuadrando); se le quitan nombre,
-- celular, correo y autorizaciones, y se borran las notas del barbero sobre esa persona.
create function private.customers_anonymize_deleted_account()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.full_name := 'Cuenta borrada';
  new.phone := null;
  new.email := null;
  new.whatsapp_opt_in := false;
  new.data_consent_at := null;
  new.data_policy_version := null;
  return new;
end;
$$;

create trigger customers_anonymize_deleted_account
  before update of user_id on public.customers
  for each row
  when (old.user_id is not null and new.user_id is null)
  execute function private.customers_anonymize_deleted_account();

-- security definer: el borrado de las notas no depende de quién borró el usuario (la app con
-- delete_my_account, o el panel de Supabase como supabase_auth_admin).
create function private.customers_forget_notes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.customer_notes where customer_id = new.id;
  return null;
end;
$$;

create trigger customers_forget_notes
  after update of user_id on public.customers
  for each row
  when (old.user_id is not null and new.user_id is null)
  execute function private.customers_forget_notes();
