# Entrega de F6

Estado del panel del barbero y del administrador en [F6](F6-panel-barbero.md). Parte A cerrada el 19/11/2026: agenda en vivo, citas, horario, bloqueos, festivos, servicios y barberos. Con esto el dueño puede cargar sus datos reales sin SQL. Lo anterior sigue en [F0](F0-entrega.md) a [F4](F4-entrega.md); las reglas, en [CLAUDE.md](../CLAUDE.md).

## Qué existe

| Pieza | Dónde | Notas |
|---|---|---|
| Pestañas | `apps/web/app/(staff)/panel/`: `page.tsx` (Hoy), `semana/`, `clientes/`, `mas/` | `PanelTabBar` solo en esas cuatro; las demás pantallas tienen atrás (`PanelHeader`) y su barra con la acción |
| Citas | `cita/nueva/`, `cita/[id]/mover/` y la hoja de la cita dentro de Hoy (`_components/agenda-view.tsx`) | `?cita=<id>` abre la hoja desde otra pantalla (la usan los bloqueos) |
| Agenda | `horario/`, `bloqueos/` | Horario semanal de una vez; bloqueos con las citas que quedan debajo; festivos sugeridos |
| Administración | `servicios/`, `servicios/nuevo`, `servicios/[id]`, `barberos/`, `barberos/nuevo`, `barberos/[id]` | Solo el administrador (`loadAdminPanel`); un barbero recibe 404 |
| Acciones | `_actions/agenda.ts`, `_actions/schedule.ts`, `_actions/admin.ts` | Cada una repite la guarda |
| Composición | `apps/web/lib/panel.ts` (`loadPanel`, `loadAdminPanel`, `canActOnBarber`), `lib/panel-dates.ts`, `panel/_lib/free-starts.ts` (`loadAgendaDays`) | Qué barbero se ve y la agenda de uno o varios días con tres consultas |
| `@possos/booking` | `.`: `buildDayAgenda`, `dayOccupancy`, `isToClose`, `bogotaInstant`, `dayBounds`, `addDays`, `isoWeekday`, `weekStart`. `/server`: `listAgenda`, `listToClose`, `listPendingApproval`, `getAgendaAppointment`, `listBookingStatus`. `/ui`: `AgendaList`, `AppointmentDetail`, `useLiveAgenda` | La agenda del día es una función pura con pruebas |
| `@possos/barbers` | `.`: `colombianHolidays`, `holidaysBetween`, `validateWeeklyRanges`, `validateBarberProfile`, `normalizeWhatsappUrl`, `isOwnImagePath`. `/server`: `listBarbers`, `getBarber`, `createBarber`, `updateBarber`, `setWorkingHours`, `listBarberServiceIds`, `setBarberServices`, `addServiceToBarbers`, `addPortfolioItem`, `deletePortfolioItem`, `setBarberPhoto`. `/ui`: `WeeklyHoursEditor`, `TimeOffForm`, `BarberForm`, `ImageUpload` | |
| `@possos/customers` | `.`: `validateStaffCustomer`, `searchTerm`, `whatsappChatUrl`. `/server`: `searchCustomers`, `getCustomer`, `staffCreateCustomer`, `listNotes`. `/ui`: `CustomerPicker` | |
| `@possos/catalog` | `.`: `validateService`, `parsePesos`. `/server`: `listServices`, `getService`, `createService`, `updateService`, `moveService`. `/ui`: `ServiceForm` | |
| `@possos/ui` | `submitKeepingValues` (nuevo) | Único cambio en `ui`; ver abajo |
| Migraciones | `20261119160000_booking_realtime.sql`, `20261119160100_customers_staff_consent.sql`, `20261119160200_barbers_working_hours.sql` | `appointments` en `supabase_realtime`; `staff_create_customer` con la versión de la política; `set_working_hours`. Cada función con su `revoke` y su `grant` |
| Semilla | `supabase/seed.sql` | `barbero2@ejemplo.test`: barbero sin administrador, **inactivo**, con 50 % |
| Pruebas | `supabase/tests/database/07_panel.test.sql` (42), Vitest en booking (`agenda`), barbers (`holidays`, `panel`), customers (`staff`) y catalog (`service-form`), `apps/web/e2e/panel.spec.ts` (9) | |

## Lo que no es evidente

### Quién ve qué

- **Cada página y cada acción llama a `loadPanel()` o `loadAdminPanel()`**, que llaman a `requireStaff` o `requireAdmin`. Un cliente recibe 404; un barbero que abre `/panel/servicios`, también.
- **El administrador elige el barbero** con el selector "Agenda de", que guarda la cookie `possos_panel_barbero` (solo para `/panel`). Sin cookie ve la propia agenda o, si no es barbero (la cuenta de Juan en producción), la del primer barbero activo. Sin barberos, "Hoy" ofrece crear uno. Un barbero no ve el selector y siempre ve la suya.
- **`canActOnBarber`** revisa en el servidor que el barbero que llega en un formulario sea uno que la sesión puede manejar, antes de llamar a la base. La base vuelve a decidir con sus guardas.
- El barbero solo encuentra en "Nueva cita" y en "Clientes" a los clientes que tienen `barber_customers` con él (RLS). Si un cliente con cuenta nunca tuvo cita con él, no lo encuentra y lo crearía de nuevo. Con un solo barbero, que además es el administrador, no pasa.

### Agenda en vivo

- **`appointments` no estaba en la publicación `supabase_realtime`**; la migración de booking la agrega. Realtime aplica RLS a cada suscriptor, así que el barbero solo recibe filas de su agenda.
- **`useLiveAgenda` le pasa el token a Realtime antes de suscribirse** (`realtime.setAuth`). El cliente del navegador carga la sesión de las cookies y, sin eso, la suscripción puede salir como anónima y no recibir nada, sin error.
- **La fila que llega no se usa**: no trae nombres. El panel llama a `router.refresh()` (con 250 ms de espera, por si llegan varios cambios seguidos) y el servidor arma la agenda otra vez. También refresca al volver a la pestaña.
- Para saber en Playwright que la suscripción ya está lista no basta el `phx_reply`: hay que esperar el mensaje `system` con `extension: "postgres_changes"` ("Subscribed to PostgreSQL").

### La agenda del día

- **`buildDayAgenda` es pura** y usa UTC-5 fijo (Colombia no tiene horario de verano). Las horas libres siguen el intervalo del barbero desde el inicio de cada rango, como las del cliente, y duran un intervalo; una cita corrida (9:30) tapa las horas que se cruzan con ella.
- **Una cita es del día en que empieza.** Un bloqueo de varios días se recorta al día y, si cubre todo el día, sale una sola fila "Todo el día".
- **"Por cerrar" y "Pendientes de aprobar" solo salen en "Hoy" del día actual**, y "Por cerrar" mira los últimos 30 días. Las citas de otros días se pueden abrir igual desde su día.
- **La hora "ahora" la da el servidor** y un intervalo la avanza cada minuto. El render no lee el reloj: las reglas de React (`react-hooks/purity`) lo rechazan.
- **El estado del recordatorio** de la hoja queda vacío hasta F7.

### Citas del personal

- **El personal escribe cualquier hora**, no solo las del intervalo (las horas libres son atajos). `staff_create_appointment` igual exige que la cita quepa en el horario (`OUTSIDE_WORKING_HOURS`, decidido en F2). Para atender fuera de horario, primero se amplía el horario de ese día.
- **Fecha y hora con `input type="date"` y `type="time"` nativos.** Cambiar la fecha reemplaza `?fecha=` en la URL para traer las horas libres de ese día sin perder lo escrito.
- **Cliente nuevo con la autorización de palabra:** `staff_create_customer` recibe `DATA_POLICY_VERSION` y la base guarda la hora. Si el cliente se crea pero la cita falla (la hora se ocupó), el formulario lo deja elegido para no crearlo dos veces.
- "Mover" usa `reschedule_appointment`, que cancela y crea en una transacción: la cita movida tiene otro id.

### Horario, bloqueos y festivos

- **El horario se guarda completo** con `set_working_hours` (una transacción). Los errores de cada día salen antes de enviar; la base vuelve a revisar.
- **Festivos calculados, no escritos:** Ley 51 de 1983 (traslado al lunes), la Pascua y la **Ley 2578 de 2026** (9 de julio, Virgen de Chiquinquirá, trasladable, desde 2026: 19 festivos). Las pruebas los comparan con el calendario oficial de 2026 y 2027. Si una ley cambia los festivos, se cambia `FIXED` en `packages/barbers/src/internal/holidays.ts` y sus pruebas.
- **Aceptar un festivo** lo bloquea de 0:00 a 0:00 del día siguiente con el motivo "Festivo: [nombre]". No aceptarlo no guarda nada: la sugerencia sigue ahí. Un festivo ya cubierto por un bloqueo dice "Bloqueado".

### Fotos y portafolio

- **La foto se reduce en el navegador** (lado mayor de 1600 px, JPEG al 85 %) y se sube directo a Storage con la sesión del navegador; las políticas de los buckets deciden. Después una acción guarda la ruta, que debe estar en `<barber_id>/` (`isOwnImagePath`).
- **Cambiar la foto borra la anterior.** Si el borrado de Storage falla, queda un archivo huérfano (no es crítico).
- **HEIC** (fotos del iPhone): Safari lo decodifica; Chrome de escritorio no, y la pantalla pide un JPG o PNG.
- "Quitar" un trabajo es un botón de cliente y no un `formAction` dentro del formulario del perfil: dentro de otro formulario, React no llegó a ejecutar esa acción.

### Barberos y servicios

- **Un barbero nuevo se crea sin cuenta** y con su porcentaje (sin porcentaje no hay cobros, F2). Queda con todos los servicios activos; un servicio nuevo queda para todos los barberos activos. Se ajusta en el perfil del barbero.
- Enlazar un barbero con su cuenta es "asignar roles", de la parte B.
- El precio y la duración propios por barbero (`barber_services.*_override`) no tienen pantalla todavía.

### `@possos/ui`: `submitKeepingValues`

- **React 19 vacía los campos no controlados de un `<form action>` al terminar la acción.** Con un error de validación, lo escrito se perdía (lo encontró Playwright en "Nuevo servicio"). `submitKeepingValues(formAction)` como `onSubmit` manda el formulario por `startTransition` y no lo resetea. F3 lo resolvía en cada formulario; ahora es una función de `ui`. Un formulario que la use no puede tener botones con su propio `formAction`.

### Pruebas

- **`playwright.config.ts` usa un solo worker**: `reserva.spec` y `panel.spec` reservan horas reales y crean servicios en la misma semilla. Un servicio activo de más cambia el flujo de reserva (deja de saltarse el paso del servicio).
- `panel.spec` limpia antes y después: cancela las citas de las cuentas de prueba y de los clientes `E2E...`, borra los bloqueos `E2E...` y desactiva los servicios `E2E...` (`cleanPanelTestData`). Los clientes `E2E...` creados en el panel quedan en la base local (no se borran clientes).
- **La foto se prueba con una imagen real** (`public/icons/icon-512.png`), así que el job `e2e` de CI ahora levanta Storage.
- **`barbero2@ejemplo.test` está inactivo** a propósito: con dos barberos activos el flujo de reserva mostraría el paso del barbero y `reserva.spec` fallaría.

### Desarrollo con dos chats

- **Next no deja correr dos `next dev` en la misma carpeta** ("Another next dev server is already running"). Si otro chat tiene el suyo en el 3000, Playwright lo reutiliza.
- **Turbopack se quedó con una versión vieja de un módulo** (`listServices is not a function` con la función ya escrita) hasta que el servidor se reinició. Next reinicia el servidor solo cuando cambia `next.config.ts`; si no, hay que reiniciar `pnpm dev`.
- Las pruebas de correo esperan el puerto 3000: `site_url` de Supabase local es `http://localhost:3000`.

## Despliegue

- Las tres migraciones de F6 se aplican a producción con `pnpm db:push` después del CI en verde (primero `--dry-run`). Sin ellas, la agenda no se actualiza sola, guardar el horario falla y "Nueva cita" con cliente nuevo falla (la función pide un parámetro que no existe).

## Pendiente

- **Parte B:** "Vino" con la hoja de cobro, corrección del mismo día y anulación con motivo; liquidación; ficha del cliente con historial y notas; porcentajes; `booking_settings` y `notification_settings`; reiniciar inasistencias; asignar y quitar roles.
- **Del dueño:** horario real, servicios con precio y duración, foto, portafolio, presentación y enlace de WhatsApp (todo se carga desde el panel), probar "Hoy" durante una jornada en paralelo con Beunik y comparar una liquidación con Beunik (parte B).
- **En un celular real:** la hoja de la cita con el gesto atrás de Android, los selectores nativos de fecha y hora de iOS y Android, subir una foto HEIC desde el iPhone, y la agenda en vivo con la pantalla bloqueada y al volver.
