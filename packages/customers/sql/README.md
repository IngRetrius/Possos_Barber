# Tablas y funciones de `customers`

Migraciones: `20261119120300_customers_core.sql`, `20261119130100_customers_consent_and_deletion.sql` (F3) y `20261119160100_customers_staff_consent.sql` (F6).

Tablas: `customers`, `barber_customers` y `customer_notes`.

Funciones:

- `link_customer_to_barber(customer_id, barber_id)`: la llama `booking` al crear cada cita. Nadie la puede llamar desde la app.
- `staff_create_customer(full_name, phone, email, whatsapp_opt_in, data_policy_version)`: el personal registra a un cliente sin cuenta; si quien lo crea es barbero, queda enlazado con él. Con `data_policy_version`, la base guarda la hora de la autorización que el cliente dio de palabra (F6).

La restricción `customers_account_has_consent` impide guardar el perfil de quien tiene cuenta sin celular, `data_consent_at` y `data_policy_version` (Ley 1581). El celular se valida en la base como `+57` y 10 dígitos; la validación detallada (celular que empieza por 3) está en `parseColombianMobile` de `@possos/customers`.

Triggers de F3:

- `customers_stamp_consent`: cuando el cliente crea su perfil o cambia `data_policy_version`, `data_consent_at` pasa a `now()`. La app no decide esa hora.
- `customers_anonymize_deleted_account` y `customers_forget_notes`: cuando `user_id` pasa a null porque se borró el usuario de Auth, el perfil queda como "Cuenta borrada" sin datos personales y se borran las notas del barbero sobre esa persona.

Las migraciones de este módulo llevan el prefijo `_customers_` en `supabase/migrations/` y solo crean o alteran estas tablas (regla 5 de [docs/08](../../../docs/08-estructura-monorepo.md#reglas-de-modularidad)). El detalle de columnas y políticas está en [docs/09](../../../docs/09-modelo-datos.md).
