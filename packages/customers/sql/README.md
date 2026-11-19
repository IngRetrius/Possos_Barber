# Tablas y funciones de `customers`

Migración: `20261119120300_customers_core.sql`.

Tablas: `customers`, `barber_customers` y `customer_notes`.

Funciones:

- `link_customer_to_barber(customer_id, barber_id)`: la llama `booking` al crear cada cita. Nadie la puede llamar desde la app.
- `staff_create_customer(full_name, phone, email, whatsapp_opt_in)`: el personal registra a un cliente sin cuenta; si quien lo crea es barbero, queda enlazado con él.

La restricción `customers_account_has_consent` impide guardar el perfil de quien tiene cuenta sin celular, `data_consent_at` y `data_policy_version` (Ley 1581). El celular se valida en la base como `+57` y 10 dígitos; la validación detallada es de F3.

Las migraciones de este módulo llevan el prefijo `_customers_` en `supabase/migrations/` y solo crean o alteran estas tablas (regla 5 de [docs/08](../../../docs/08-estructura-monorepo.md#reglas-de-modularidad)). El detalle de columnas y políticas está en [docs/09](../../../docs/09-modelo-datos.md).
