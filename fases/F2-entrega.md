# Entrega de F2

Estado de la base de datos al cerrar [F2](F2-datos-agenda.md), el 19/11/2026. Es el punto de partida de F3 a F7. La especificación sigue en [docs/09](../docs/09-modelo-datos.md), que ya está al día con lo construido. Este documento cuenta lo que existe y lo que no es evidente al leer las migraciones.

## Qué existe

| Pieza | Dónde | Estado |
|---|---|---|
| Migraciones | `supabase/migrations/20261119120000` a `120600`, una por módulo: `auth`, `catalog`, `barbers`, `customers`, `booking`, `commissions` y `notifications` | Aplican limpias con `pnpm db:reset` |
| Pruebas pgTAP | `supabase/tests/database/01_schema`, `02_booking`, `03_rls` y `04_commissions`: 131 aserciones | En verde. Cubren las 10 obligatorias de docs/09 y las adicionales de F2 |
| Fixture de pruebas | `supabase/tests/fixtures/setup.psql` | Usuarios, dos barberos (A es admin), un servicio, tres clientes y ayudantes `tests.login()`, `tests.at()` |
| Semilla | `supabase/seed.sql` | "Corte normal", 60 min, precio null (**[PENDIENTE]**); barbero administrador con 50 %; horario **de ejemplo**; dos clientes. Cuentas en el [README](../README.md#desarrollo-local) |
| Tipos | `packages/supabase/src/database.types.ts` | Regenerados con `pnpm db:types`. Cada módulo reexporta los de sus tablas |
| API de servidor | `@possos/catalog/server`, `@possos/barbers/server`, `@possos/booking/server`, `@possos/commissions/server` | Funciones delgadas sobre las RPC. Devuelven `Result` con un código de error estable |
| Eventos | `@possos/booking/events` | Contrato versión 1 de `booking_events` |
| Textos de error | `src/internal/errors.ts` de booking, barbers y commissions | Probados con Vitest; listados en [docs/11](../docs/11-interfaz.md#errores-de-la-base) |

## Cómo se usa desde la app

```ts
import { createClient } from "@possos/supabase/server";
import { book } from "@possos/booking/server";
import { bookingErrorMessage } from "@possos/booking";

const db = await createClient();
const result = await book(db, { serviceId, startAt, barberId });
if (!result.ok) return { error: bookingErrorMessage(result.error) };
```

- Cada función de servidor recibe el cliente de quien actúa. Con el de la sesión, Postgres decide por RLS y por las funciones quién puede qué. Solo el servidor de notificaciones (F7) usa `createAdminClient()`, y solo para `getAppointmentForNotification` y `confirmAppointment(..., via: "whatsapp")`.
- Fechas y horas en ISO 8601; días en `YYYY-MM-DD`, en hora de Bogotá.

## Lo que no es evidente

### Seguridad

- **Supabase deja ejecutar toda función de `public` a `anon` y `authenticated` por omisión.** Cada migración revoca ese permiso y lo concede solo a quien corresponde. Una función nueva que se olvide del `revoke` queda abierta a cualquiera; `01_schema.test.sql` revisa las más delicadas.
- **Funciones internas en el esquema `private`**, que PostgREST no expone. Las de cada módulo llevan su prefijo (`private.booking_check`, ...).
- **Cuidado con null en las guardas.** Para quien no es barbero, `current_barber_id()` es null, y `barber_id = null` también. Un `if not (is_admin() or barber_id = current_barber_id())` da null y **no lanza el error**. Por eso todas las guardas usan `coalesce(..., false)` (por ejemplo, `private.booking_is_staff_for`). Las pruebas pgTAP encontraron este error en F2 y ahora lo cubren: un cliente que llama funciones del personal recibe `NOT_FOUND` o `FORBIDDEN`.
- **`link_customer_to_barber` no se puede llamar desde la app**: un barbero que la llamara podría verse con cualquier cliente. Solo la usan las funciones de booking y `staff_create_customer`.
- **Columnas protegidas.** El cliente solo escribe las columnas de su perfil en `customers` (privilegios por columna). El barbero no cambia su `user_id`, `active` ni `slot_interval_min` (lo impide un trigger).
- **Ley 1581 en la base:** `customers_account_has_consent` impide guardar un perfil con cuenta sin celular, `data_consent_at` y `data_policy_version`. F3 solo tiene que llenar esas columnas.

### Reglas de la agenda

- **Errores con el código en el mensaje** (`raise exception 'SLOT_TAKEN'`, SQLSTATE `P0001`). `errorCode()` de `@possos/supabase` lo reconoce; cualquier otro error queda como `UNKNOWN`.
- **Horas alineadas al intervalo del barbero desde el inicio de cada rango.** Con un rango de 9:30 y un intervalo de 60, las horas son 9:30, 10:30... El cliente solo puede reservar esas horas. El personal puede usar cualquier hora que quepa en el horario.
- **El personal también respeta el horario.** docs/09 dice "igual, sin las reglas de anticipación": `staff_create_appointment` rechaza una cita fuera del horario con `OUTSIDE_WORKING_HOURS`. Si el dueño quiere atender fuera de horario, primero amplía su horario de ese día. Si eso resulta incómodo en F6, se decide con él.
- **Bloqueos en dos pasos.** `create_time_off` es de `barbers` y no conoce las citas; `list_conflicting_appointments` es de `booking`. `blockTime()` de `@possos/booking/server` llama a las dos. Las carreras las resuelven el candado sobre `barbers` y el trigger de `appointments`.
- **Reprogramar cancela primero y después crea**, en la misma transacción. Así una cita se puede mover 30 min sin chocar consigo misma. Si la nueva falla, se deshace todo. La cancelación de la vieja no publica `appointment.cancelled`: el trigger la reconoce por el ajuste de transacción `possos.rescheduling`.
- **"Cualquiera disponible"** desempata por la última asignación automática (`auto_assigned`) de cada barbero; quien nunca la recibió va primero.
- **Precio null.** Mientras el dueño no dé el precio, `services.price_cop` y `appointments.price_cop` quedan en null. `record_charge` sin monto devuelve `INVALID_AMOUNT` si la cita no tiene precio.
- **Broadcast** con `realtime.send(..., private => false)` dentro de un `begin ... exception when others` vacío. Si falla, la reserva sigue. En CI solo corre Postgres sin Realtime, y por eso falla siempre sin que se note.

### Cobros

- **Sin porcentaje no hay cobro** (`NO_COMMISSION_RATE`): no hay un 50 % fijo en el código. El script del primer administrador (F3) debe crear su fila en `commission_rates` con 50, y el panel de F6 la de cada barbero nuevo.
- El reparto lo calculan columnas generadas: `barber_amount_cop = round(amount_cop * barber_pct / 100)` y `business_amount_cop = amount_cop - barber_amount_cop`. Siempre suman lo cobrado.
- "Mismo día" y los periodos de liquidación se calculan en hora de Bogotá, fija en las funciones de commissions.

### Pruebas pgTAP

- Cada archivo incluye el fixture con `\ir ../fixtures/setup.psql`. La extensión `.psql` evita que `pg_prove` lo corra como prueba.
- **No se puede correr un solo archivo** con `supabase test db <archivo>`: la CLI copia solo ese archivo y el `\ir` no encuentra el fixture. Se corre la carpeta completa con `pnpm db:test`.
- Para depurar un archivo con psql dentro del contenedor hay que instalar pgTAP en la transacción (`create extension pgtap with schema extensions`), porque solo existe mientras corre `supabase test db`.
- Dentro de un mismo `select`, dos subconsultas comparten la instantánea: no ven lo que insertó una función llamada en ese mismo `select`. Primero se llama la función y luego se consulta, en dos sentencias.
- Las pruebas usan horas relativas a hoy (`tests.at(2, '10:00')`), con un horario de prueba de 6:00 a 22:00 todos los días, para que pasen a cualquier hora.

## Despliegue

- **Las migraciones no llegan solas a producción.** Las de F2 se aplicaron el 19/11/2026 con `pnpm db:push`. En producción quedaron 21 tablas, todas con RLS, más `no_double_booking`, `booking_settings` y los buckets. Cada fase que agregue migraciones las aplica igual, después de que el CI quede en verde.
- Para enlazar el repo con producción, una sola vez por equipo: `pnpm exec supabase login` y `pnpm exec supabase link --project-ref <ref del proyecto Possos_Barber>`. El enlace queda en `supabase/.temp`, que no se sube al repo.
- La semilla no se aplica en producción.

## Pendiente

- **Del dueño:** el horario real de atención ([decisión 3](../docs/10-riesgos-decisiones-abiertas.md)) y el precio del corte. Mientras tanto, la semilla usa un horario de ejemplo y el precio queda en null.
- **De F3:** el script del primer administrador (fila en `staff_roles`, `barbers` y `commission_rates`) y las guardas de servidor que usan `is_admin()` y `current_barber_id()`.
- **De F7:** el despacho con `event_cursors`. Las tablas existen; la lógica no.
