# Entrega de F4

Estado de la página pública y del flujo de reserva al cerrar [F4](F4-reserva-cliente.md), el 19/11/2026. Es el punto de partida de F5 (Mis citas, que reutiliza el resumen, el .ics y los estados) y de F6 (el panel, que puede reutilizar el selector de horas). Lo anterior sigue en [F0](F0-entrega.md), [F1](F1-entrega.md), [F2](F2-entrega.md) y [F3](F3-entrega.md); las reglas, en [CLAUDE.md](../CLAUDE.md).

## Qué existe

| Pieza | Dónde | Notas |
|---|---|---|
| Inicio público | `apps/web/app/(public)/page.tsx` | Marca, servicios, barbero con foto y portafolio, ubicación, horario, Instagram y WhatsApp, y la barra con "Reservar". Datos estructurados `BarberShop`. Con una cita próxima, la muestra primero |
| Datos del negocio | `apps/web/lib/business.ts` | Nombre, ciudad, Instagram. Frase y dirección en null: la página dice **[PENDIENTE]**. `WHATSAPP_REMINDERS_ENABLED` en false hasta F7 |
| Pasos | `apps/web/app/(customer)/reservar/`: `page.tsx` (servicio), `barbero/`, `horario/`, `confirmar/`, `listo/` | Cada paso es una página. La acción "Reservar" está en `reservar/actions.ts` |
| Composición del flujo | `apps/web/lib/booking-flow.ts` | Junta catalog, barbers y booking: qué servicio y qué barbero valen, qué pasos se muestran y a cuál volver |
| .ics | `/mis-citas/[id]/calendario.ics` (route handler) | Solo para el dueño de la cita. F5 lo reutiliza desde "Mis citas" |
| Instalar la app | `apps/web/app/_components/install-hint.tsx` | En iPhone, una hoja con los pasos; en Android, el aviso del navegador (cuando exista el manifiesto de F8) |
| `@possos/booking` | `.`: `parseSelection`, `selectionHref`, `bookingSteps`, `stepPosition`, `pickInitialDay`, `nextDayWithSlots`, `normalizeInstant`, `appointmentIcs`, `APPOINTMENT_STATUS_DISPLAY`, `BOOKING_ROUTES`, `ANY_BARBER`. `/server`: `getAvailableDays`, `getAvailableStarts`, `requiresApproval`, `getAppointment`. `/ui` (nueva): `TimePicker`, `BookForm`, `AppointmentSummary` | La tabla de estado a tono y texto que F1 dejó en la página de muestras ya vive aquí |
| `@possos/catalog` | `.`: `servicePriceLabel`, `PENDING`. `/server`: `getActiveService`. `/ui` (nueva): `ServiceList` | |
| `@possos/barbers` | `.`: `groupOpeningHours`, `formatTimeOfDay`. `/server`: `getOpeningHours`, `listBarbersForService`, `listPortfolio`, `publicImageUrl`. `/ui` (nueva): `BarberList`, `BarberProfile`, `OpeningHoursList` | |
| Migraciones | `20261119140000_barbers_opening_hours.sql`, `20261119140100_booking_available_days.sql` | `get_opening_hours()`, `get_available_days()` y `my_booking_requires_approval()`. Solo agregan funciones, con su `revoke` y su `grant` |
| Semilla | `supabase/seed.sql` | Dos cuentas más: `cliente2@ejemplo.test` y `aprobacion@ejemplo.test` (2 inasistencias) |
| Pruebas | `supabase/tests/database/06_reserva.test.sql` (17), Vitest en booking (`selection`, `ics`), barbers (`hours`) y catalog (`price`), `apps/web/e2e/reserva.spec.ts` (7) | Playwright corre en serie contra Supabase local con Realtime |

### Cambios fuera de los paquetes de F4

- **`packages/ui`:** `DateStrip` se vuelve un mes de 7 columnas (lunes a domingo) desde `md:`. Solo cambian el CSS y unas celdas vacías decorativas; los radios, los nombres accesibles y el comportamiento en el celular son los mismos.
- **`apps/web/app/globals.css`:** `@source "../../../packages"`. Antes Tailwind solo escaneaba la app y `packages/ui`: las clases que solo usaban los paquetes de dominio no se generaban (se notó con la columna de horas en escritorio). Con un glob (`packages/*/src`) no funcionó; con la carpeta sí.
- **`(customer)/layout.tsx`** ya no pone el encabezado con el logo: los pasos usan `StepHeader` y `/perfil` pone su propio `SiteHeader`.
- **`proxy.ts`:** `/reservar/listo` exige sesión. Los demás pasos no: la cuenta se pide en "Confirmar".
- **`next.config.ts`:** `images.remotePatterns` con los buckets públicos de Supabase (desde `NEXT_PUBLIC_SUPABASE_URL`) y `dangerouslyAllowLocalIP` solo con `next dev`.
- **Íconos:** el layout raíz declara `icon-192.png` y `apple-touch-icon.png` (antes `/favicon.ico` daba 404).
- **CI:** el job `e2e` ahora levanta Realtime.

## Cómo se usa desde F5 y F6

```ts
// Volver a reservar (F5): el flujo con el servicio y el barbero de la cita pasada.
import { BOOKING_ROUTES, selectionHref } from "@possos/booking";
<Link href={selectionHref(BOOKING_ROUTES.time, { serviceId, barberId })}>Volver a reservar</Link>

// Estado de una cita (F5 y F6).
import { APPOINTMENT_STATUS_DISPLAY } from "@possos/booking";
const { label, tone } = APPOINTMENT_STATUS_DISPLAY[appointment.status];
<StatusBadge tone={tone}>{label}</StatusBadge>

// Agregar al calendario (F5).
<a href={`/mis-citas/${id}/calendario.ics`} download>Agregar al calendario</a>
```

- `CUSTOMER_HOME` es `/` desde el 19/11/2026 (ver [F3-entrega](F3-entrega.md)). Cuando F5 cree `/mis-citas`, la cita próxima del inicio puede llevar ahí.

## Lo que no es evidente

### Estado en la URL

- **El flujo vive en la URL:** `?servicio=<uuid>&barbero=<uuid|cualquiera>&fecha=YYYY-MM-DD&hora=<ISO>`. `parseSelection` descarta lo que no tiene forma válida, y cada página revisa contra la base que el servicio esté activo y que el barbero lo haga. Lo que falta o no vale manda al paso que corresponde.
- **La hora va en UTC con `toISOString`** (`2026-11-20T14:00:00.000Z`). PostgREST devuelve `2026-11-20T14:00:00+00:00`; `getAvailableStarts` las normaliza para compararlas con la URL. Para comparar horas, siempre `normalizeInstant`.
- **Con un solo barbero, la URL igual lleva su id** (`barbero=<uuid>`): así la consulta de horas y la suscripción de Realtime saben de quién son. Con uno solo, el paso de barbero se salta con una redirección.
- **Pasar de un paso a otro agrega una entrada al historial; cambiar de día o de hora, no.** El día usa `router.replace` (el servidor trae las horas); la hora usa `window.history.replaceState` (Next lo sincroniza con `useSearchParams` sin ir al servidor). Así el botón atrás recorre los pasos y no los días.
- **Al volver atrás, Next pinta el horario desde su caché** con las props de la primera visita, sin la hora que se eligió después. Por eso `TimePicker` lee la hora con `useSearchParams` y no solo de sus props. Lo cubre la prueba del botón atrás.
- **"Reservar" redirige a "Listo" reemplazando "Confirmar"** (`RedirectType.replace`): atrás no vuelve a un resumen que ya no se puede reservar. Con `SLOT_TAKEN` también reemplaza, hacia el horario del mismo día con `aviso=ocupada`.

### Disponibilidad y Realtime

- **`get_available_days`** cuenta, en una sola llamada, las horas de cada día de la ventana (hoy y 30 días más) llamando a `get_available_slots` por día. Son 31 llamadas dentro de Postgres; con un barbero tarda milisegundos. Si crecen los barberos, se puede reescribir sin cambiar la firma.
- **El cliente se suscribe a `slots:<barber_id>:<fecha>`** del día que mira; con "Cualquiera disponible", a los de todos los barberos del servicio. El aviso solo dice "cambió" y la página llama a `router.refresh()`, que vuelve a pedir las horas en el servidor. También refresca al volver a la pestaña (`visibilitychange`), por si se perdió un aviso.
- **"Esa hora se acaba de ocupar"** aparece solo si la hora elegida estaba en la lista anterior y ya no está. Una hora que llega en la URL y no está libre al cargar se descarta sin aviso, salvo que venga con `aviso=ocupada` (desde "Confirmar" o desde la acción).
- **"Confirmar" vuelve a revisar la hora al cargar.** Si se ocupó mientras el cliente se registraba, manda al horario con el aviso, antes de que toque "Reservar".
- **Esqueleto:** al cambiar de día, si la respuesta tarda más de 300 ms, aparece `SlotGridSkeleton`; antes, un espacio vacío del mismo alto, para no mostrar las horas del día anterior.
- **El cliente no ve su contador de inasistencias** (docs/06). `my_booking_requires_approval()` le dice solo si su reserva quedará pendiente. La primera versión abría su fila de `customer_booking_status` con una política; `03_rls` lo detectó y se cambió por la función.

### Página pública

- **El horario sale de `get_opening_hours()`**, no de `working_hours`, que no se puede leer sin ser personal. Junta los rangos de todos los barberos activos y `groupOpeningHours` agrupa los días con el mismo horario ("Lunes a sábado", "Domingo: Cerrado").
- **En producción hoy no hay servicios, barberos ni horario** (la semilla es solo local). El inicio dice **[PENDIENTE]** en cada sección y "Reservar" lleva a "Todavía no hay servicios para reservar". Cambia solo cuando lleguen los datos del dueño (F6 o F9).
- **El mapa** solo aparece cuando haya dirección: un `iframe` de Google Maps sin clave de API y el enlace "Abrir en Google Maps".
- **Fotos y portafolio** usan `next/image` con los buckets públicos. No hay imágenes en la semilla, así que esa parte solo está probada con tipos y con el estado vacío ([PENDIENTE]).
- **WhatsApp del inicio** es el `whatsapp_url` del primer barbero activo que lo tenga. Hoy ninguno lo tiene.

### Lo que todavía es simple

- **Duración y precio del resumen** salen del servicio (`services.duration_min` y `price_cop`). Si un barbero tiene `duration_min_override` o `price_cop_override` en `barber_services`, el resumen de "Confirmar" no los refleja; la cita sí se crea con los de `booking_offer` y "Listo" muestra el precio guardado en la cita. Con un barbero y sin sobrescrituras no cambia nada.
- **"Te llega un WhatsApp para confirmar un día antes"** no se muestra hasta que F7 prenda `WHATSAPP_REMINDERS_ENABLED`: hoy sería falso.
- **"Instalar la app"** en Android depende del manifiesto de F8. En iPhone la hoja aparece desde ya y deja un acceso en la pantalla de inicio; con F8 se abrirá como app.

### Pruebas

- **`reserva.spec.ts` reserva horas reales** en la base local. Corre en serie y, antes y después, el administrador de la semilla cancela las citas futuras de las cuentas de prueba (`cliente`, `cliente2`, `aprobacion` y las `e2e-...`). Las citas de otras cuentas no se tocan.
- **La "otra persona" que toma la hora** es `cliente2@ejemplo.test` por la API REST (`e2e/support/supabase.ts`, sin dependencias nuevas). Lee la URL y la clave publicable del entorno o de `apps/web/.env.local`.
- **Para saber que la página ya escucha el canal**, la prueba lee los mensajes del WebSocket. El cliente de Realtime usa mensajes en arreglo (`[join_ref, ref, topic, event, payload]`), no objetos.
- **La prueba de 4 toques toma la primera hora del día que se muestra.** Si es hoy y está a menos de 2 h, el cliente ya no podría cancelarla, pero la limpieza la hace el administrador, que no tiene ese límite.
- **Lighthouse** no corre en CI. Se midió a mano con `pnpm dlx lighthouse@12.8.2` y el Chromium de Playwright sobre `next build && next start`.

## Despliegue

- Las dos migraciones de F4 se aplicaron a producción el 19/11/2026 con `pnpm db:push`, después del CI en verde. Producción y el repo tienen las mismas 11 migraciones.
- En `https://possos-web.vercel.app` el inicio dice **[PENDIENTE]** en servicios, barbero y horario, y "Reservar" lleva a "Todavía no hay servicios para reservar": producción todavía no tiene los datos del dueño.

## Pendiente

- **Del dueño:** servicios con precio y duración ([decisión 2](../docs/10-riesgos-decisiones-abiertas.md)), dirección ([decisión 4](../docs/10-riesgos-decisiones-abiertas.md)), frase de presentación, foto, portafolio, enlace de WhatsApp y horario real. Lo que se puede cargar desde el panel llega en F6; mientras tanto, por SQL.
- **De Juan:** probar en producción "Continuar con Google" desde "Confirmar" con una cuenta real y medir los toques con Google ya usado en el celular. Sigue pendiente el iPhone real de F3 ([riesgo 6](../docs/10-riesgos-decisiones-abiertas.md)).
- **En celulares reales:** la tira de días y la cuadrícula con VoiceOver y TalkBack (de F1), y la hoja de "Instalar la app" en Safari de iOS (el nombre exacto de "Agregar a inicio" según la versión).
