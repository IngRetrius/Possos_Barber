# Entrega de F5

Estado de "Mis citas" al cerrar [F5](F5-mis-citas.md), el 19/11/2026. Es el punto de partida de F7 (los botones de WhatsApp llevan a `/mis-citas/<id>`). Lo anterior sigue en [F0](F0-entrega.md) a [F4](F4-entrega.md) y [F6](F6-entrega.md); las reglas, en [CLAUDE.md](../CLAUDE.md).

## Qué existe

| Pieza | Dónde | Notas |
|---|---|---|
| Lista | `apps/web/app/(customer)/mis-citas/page.tsx` | Próxima cita con sus acciones, "También tienes", "Citas pasadas" (10, y `?historial=todas`) y el estado vacío |
| Una cita | `mis-citas/[id]/page.tsx` | Destino de los WhatsApp de F7 y de "También tienes". `?aviso=cambiada` muestra "Cambiamos tu cita" |
| Cambiar hora | `mis-citas/[id]/cambiar/` (horario) y `cambiar/confirmar/` | Dos pasos, como la reserva |
| .ics | `mis-citas/[id]/calendario.ics/route.ts` | Ahora lee la cita con `getMyAppointment` (antes con las listas de servicios y barberos activos) |
| Acciones | `mis-citas/actions.ts` | `cancelMyAppointmentAction` (no redirige) y `rescheduleMyAppointmentAction` |
| Guarda común | `mis-citas/_components/my-appointments.ts` | `loadMyAppointment` y `cardContext` (precio, dirección y el Instagram de respaldo) |
| `@possos/booking` | `.`: `MyAppointment`, `isUpcoming`, `canChange`, `canReschedule`, `splitMyAppointments`, `myStatusDisplay`, `atTime`, `MY_APPOINTMENTS_ROUTES`. `/server`: `listMyAppointments`, `getMyAppointment`. `/ui`: `MyAppointmentCard`, `MyAppointmentHistory`, `CancelAppointment`, `RescheduleForm` | `TimePicker` recibe `paths` (ver abajo) |
| Inicio | `apps/web/app/(public)/page.tsx` | "Mis citas" arriba para el cliente; la tarjeta "Tu próxima cita" es un enlace a la cita |
| Sesión | `apps/web/lib/session.ts` | `MY_APPOINTMENTS_PATH`; `requireCustomer(db, path, { staffTo })` |
| Migración | `20261119170000_booking_my_appointments.sql` | `list_my_appointments(id?, limit?)`, con su `revoke` y su `grant` (solo `authenticated`) |
| Pruebas | `supabase/tests/database/08_mis_citas.test.sql` (19), Vitest en booking (`my-appointments`, y dos más en `ics`), `apps/web/e2e/mis-citas.spec.ts` (7) | |

No se tocó `packages/ui`.

## Cómo se usa desde F7

```ts
// Botón del WhatsApp: la cita del cliente. Sin sesión pide ingresar y vuelve.
import { MY_APPOINTMENTS_ROUTES } from "@possos/booking";
const url = new URL(MY_APPOINTMENTS_ROUTES.detail(appointmentId), siteUrl());
```

- Si la cita se reprogramó después de mandar el mensaje, el enlace viejo lleva a la cita nueva (`replaced_by`). También el de `/cambiar` y el del `.ics`.
- Si quien abre el enlace es del personal, va a `/panel?cita=<id>`; si es otro cliente, 404.

## Lo que no es evidente

### Por qué una función nueva y no las tablas

- **RLS no deja al cliente leer servicios ni barberos inactivos.** Con las consultas de F4, una cita pasada de un servicio desactivado perdía el nombre. `list_my_appointments` es `security definer`, filtra por el cliente de la sesión (`customers.user_id = auth.uid()`) y devuelve los nombres, si siguen activos y el WhatsApp del barbero. No expone nada de otro cliente: la prueba pgTAP lo revisa también con el id de una cita ajena.
- **`change_deadline` lo calcula la base** con `cancel_window_min`. La interfaz solo compara con la hora: si el administrador cambia el límite en "Configuración", "Mis citas" lo sigue sin tocar código. `cancel_appointment` y `reschedule_appointment` vuelven a revisar (`TOO_LATE_TO_CANCEL`). Si alguien deja la página abierta hasta pasar el límite, los botones siguen ahí, pero la base responde con el error y la hoja o la barra lo muestran.
- **Las reprogramadas no salen en la lista** (las reemplaza la nueva, que tiene `rescheduled_from`). Pedidas por id, sí, con `replaced_by`.
- El tipo generado de una función marca todas sus columnas como no nulas; `toMyAppointment` trata como nulos `barber_whatsapp_url`, `price_cop` y `replaced_by`.
- **pgTAP:** `reset role` no borra `request.jwt.claims`. Un `update` como superusuario después de un `tests.login()` sigue viéndose como ese usuario para `auth.role()`, y el trigger de `barbers` lo rechaza. La prueba limpia los claims antes (`set_config('request.jwt.claims', '{}', true)`). Y una subconsulta dentro de una prueba que corre con sesión de cliente pasa por RLS: un id de otra cuenta se toma antes con `\gset`.

### Cancelar

- **La hoja se cierra antes de refrescar.** `CancelAppointment` llama a la acción, cierra la hoja y, después del `popstate` con que la hoja quita su entrada del historial (o a los 500 ms), muestra "Cancelaste tu cita" y llama a `router.refresh()`. Es el mismo cuidado de `DeleteAccount` (F3) y de `useCloseThenNavigate` (F6): si se refresca antes, el `back()` de la hoja puede pintar la página de antes.
- La acción no llama a `revalidatePath` ni redirige: el refresco lo pide el cliente.
- El cliente cancela sin motivo (`cancel_reason` queda null); el motivo solo lo exige la base al personal.

### Cambiar hora

- **`TimePicker` recibe `paths`** (`{ time, confirm }`). Con ellas la URL no lleva `servicio` ni `barbero`, porque la ruta ya dice qué cita es: `/mis-citas/<id>/cambiar?fecha=...&hora=...`. Sin `paths` funciona igual que en F4.
- **La hora actual no aparece en la cuadrícula**: `get_available_slots` la ve ocupada por la misma cita. Con el intervalo igual a la duración (hoy, 60 y 60) solo se esconde esa hora. Si un barbero tuviera un intervalo menor que la duración, también se esconderían las horas que se cruzan con la cita actual, aunque `reschedule_appointment` sí permitiría moverla ahí. No pasa con los datos de hoy; si pasa, se agrega a `get_available_slots` un parámetro para ignorar una cita.
- **El servicio y el barbero no cambian.** "Cambiar hora" no aparece si alguno quedó inactivo (`canReschedule`); "Cancelar" sí.
- `SLOT_TAKEN` vuelve al paso 1 del mismo día con `aviso=ocupada`, reemplazando "Confirmar" en el historial; la cita original queda igual (la transacción se deshace). Al cambiar, va a la cita nueva también reemplazando "Confirmar".
- La duración del paso 1 y el fin del resumen salen de la cita (fin menos inicio), no del servicio.
- Si la cita estaba pendiente de aprobación, o el cliente ya necesita aprobación, el paso 2 lo avisa: la nueva queda `pending_approval`.

### Por qué el inicio sigue siendo el inicio del cliente

`CUSTOMER_HOME` sigue en `/` (decisión del 19/11/2026), con "Mis citas" en el encabezado y la tarjeta de la próxima cita como enlace:

- Quien ingresa por primera vez no tiene citas: en `/mis-citas` vería una lista vacía en vez de los servicios y "Reservar".
- Quien ingresa desde "Confirmar" vuelve a `next` de todas formas; el cambio solo afectaría a quien ingresa desde el inicio.
- El inicio ya muestra la próxima cita, y ahora llega a cambiarla o cancelarla con un toque.
- No hubo que tocar `cuentas.spec` ni la decisión del 19/11.

### Estados que ve el cliente

- Una cita que ya pasó y el barbero todavía no marca sigue `booked` o `confirmed` en la base. Para el cliente dice "Pasada" (`myStatusDisplay`); "Sin confirmar" o "Por cerrar" no le dicen nada.
- Las canceladas por el personal o por la limpieza de pruebas salen en el historial como "Cancelada", igual que las del cliente.

### .ics

- "Agregar al calendario" lleva a `/mis-citas/[id]/calendario`, que mira el user agent (`calendarTarget`). En iPhone, iPad y Mac redirige al `.ics`, que Safari abre en Calendario. En Android el `.ics` solo se descargaba y Google Calendar no lo importa desde el celular, así que ahí y en lo demás redirige a Google Calendar (`googleCalendarUrl`) con la cita llena; el cliente toca "Guardar" y el evento queda en su cuenta de Google. Google no recibe el aviso de 1 hora: usa los recordatorios por omisión de la cuenta.
- Las horas van en UTC (`20261121T000000Z`), que todos los calendarios convierten a la hora del teléfono; no se usa `TZID`, que obliga a incluir la definición de la zona. Vitest prueba que las 7:00 p. m. de Bogotá salen como las 00:00 UTC del día siguiente.
- `LOCATION` lleva la dirección y la ciudad; la referencia ("Casa esquinera naranja") va en la descripción, junto con el enlace a la cita.
- Solo el cliente dueño de la cita lo descarga; otra cuenta recibe 404. Antes el personal también podía (por RLS); no lo usaba.
- Cambiar o cancelar la cita **no actualiza** el evento que ya se importó: el `.ics` es un archivo suelto, no una suscripción. La cita nueva tiene otro id y otro `UID`.

### Pruebas

- `mis-citas.spec` corre en serie y llama a `cancelTestAppointments` antes de cada prueba y al final. La de la ventana de 2 h pone `cancel_window_min` en 60 días y le da al barbero de la semilla un WhatsApp de prueba; los devuelve a 120 y a null en un `finally` y otra vez en `afterAll`.
- Se repitió con `--repeat-each=5` (35 de 35) sin fallos.
- `cliente@ejemplo.test` acumula citas canceladas con cada corrida: por eso el historial se corta en 10.

## Despliegue

- La migración `20261119170000_booking_my_appointments.sql` se aplica a producción con `pnpm db:push` después del CI en verde (primero `--dry-run`). **Sin ella, "Mis citas", la página de una cita y el `.ics` fallan en producción**: llaman a una función que no existe.

## Pendiente

- **En un celular real:** importar el `.ics` en Calendario de iOS (desde Safari y desde la PWA instalada, que puede no ofrecer la descarga) y en Google Calendar desde Android (Chrome suele bajarlo a Descargas y hay que abrirlo con Calendar); revisar que la hora y la dirección salgan bien y que el aviso llegue una hora antes. La hoja de cancelar con el gesto atrás de Android. El botón "Escríbele al barbero" abriendo WhatsApp.
- **Del dueño:** el enlace de WhatsApp en su perfil de barbero (desde el panel). Mientras no lo ponga, pasado el límite se ofrece el Instagram de la barbería. El precio de los servicios ya está cargado en producción.
- **Para F7:** los botones de los mensajes llevan a `/mis-citas/<id>`. Confirmar la cita desde la app (`confirm_appointment` con `via: "customer"`) no tiene botón en "Mis citas": la confirmación es del WhatsApp de F7.
