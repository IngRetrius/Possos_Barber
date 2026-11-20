# Entrega de F8

Estado de la PWA, lo que se ve sin conexión y el push al barbero al cerrar [F8](F8-pwa-push.md), el 19/11/2026. Es el punto de partida de F7 (WhatsApp usa el mismo despacho de `booking_events`) y de F9 (pruebas en celulares reales). Lo anterior sigue en [F0](F0-entrega.md) a [F6](F6-entrega.md); las reglas, en [CLAUDE.md](../CLAUDE.md).

## Qué existe

| Pieza | Dónde | Notas |
|---|---|---|
| Manifiesto | `apps/web/app/manifest.ts` | "Possos Barber" ("Possos"), `standalone`, `colors.bg` de `@possos/ui`, íconos de F1 (192, 512 y *maskable*). El layout agrega `appleWebApp` (barra de estado negra) |
| Service worker | `apps/web/app/sw.ts` | Lo compila `app/serwist/[path]/route.ts` (`@serwist/turbopack`) y se sirve en `/serwist/sw.js` |
| Registro, avisos de estado y caché por cuenta | `app/_components/pwa-runtime.tsx`, `offline-cache.ts`, `keep-offline.tsx` | "Sin conexión" y "Hay una versión nueva" arriba de todas las pantallas |
| Pantalla sin conexión | `app/sin-conexion/page.tsx` | Estática; el worker la guarda al instalarse |
| Límite de error | `app/error.tsx` | Una acción que no llega al servidor (sin conexión) ya no muestra la pantalla genérica de Next |
| Constantes compartidas | `apps/web/lib/pwa.ts` | Nombres de caché, rutas guardadas, mensaje `SKIP_WAITING`. Las importa el worker y las páginas |
| "Avisos" en "Más" | `(staff)/panel/_components/push-settings.tsx`, `_actions/push.ts` | Solo quien es barbero. Activar, enviar uno de prueba y desactivar |
| Ruta de despacho | `app/api/notifications/dispatch/route.ts` y `lib/dispatch.ts` | La llama la base (`pg_net` y `pg_cron`). `Authorization: Bearer <CRON_SECRET>` |
| `@possos/notifications` | `.`: `pushKindFor`, `pushMessageFor`, `appointmentPanelUrl`, `TEST_PUSH_MESSAGE`. `/server`: `dispatchBookingEvents`, `cursorStore`, `EventConsumer`, `pushConsumer`, `pushTargets`, `webPushSender`, `vapidFromEnv`, `savePushSubscription`, `deletePushSubscription`, `sendTestPush` | `web-push` 3.6.7. Ahora depende de `@possos/booking`, solo por el contrato de eventos (como permite docs/08) |
| `@possos/booking` | `CancelAppointment` (`/ui`) | Sin conexión, el error sale en la hoja en vez de tumbar la página. Único cambio en booking |
| "Mis citas" | `(customer)/mis-citas/page.tsx` y `[id]/page.tsx` | `KeepOffline` y, al final de la lista, "Instalar la app" con su frase (`InstallHint` recibe `lead`) |
| Migración | `20261119180000_notifications_dispatch.sql` | `pg_net`, `pg_cron`, `lease_until` en `event_cursors`, `claim_booking_events`, `ack_booking_events`, `save_push_subscription`, `list_push_targets`, el trigger que pide el despacho y el trabajo de `pg_cron`. Cada función con su `revoke` y su `grant` |
| Semilla | `supabase/seed.sql` | La URL y el secreto del despacho en Vault, solo para local |
| Pruebas | `supabase/tests/database/09_despacho.test.sql` (33), Vitest en notifications (`push-message`, `dispatch`), `apps/web/e2e/pwa.spec.ts` (6) | |

No se tocó `packages/ui`.

## Cómo se conecta F7 al despacho

El despacho ya existe y no hay que rehacerlo. F7 agrega su consumidor:

```ts
// packages/notifications: un consumidor más. Debe tolerar ver un evento dos veces (entrega al
// menos una vez): message_jobs ya tiene único (appointment_id, kind, offset_min, channel).
export function whatsappConsumer(deps): EventConsumer {
  return {
    name: "whatsapp",
    handle: async (event) => {
      // crear o saltar message_jobs; "retry" si la base falla
      return "done";
    },
  };
}

// apps/web/lib/dispatch.ts: a la lista, y después los trabajos vencidos.
const reports = await dispatchBookingEvents(admin, [push, whatsappConsumer(...)], log);
await dispatchDue(admin, ...); // F7
```

En una migración nueva de F7 (`..._notifications_whatsapp.sql`):

1. `create or replace function private.notifications_consumers()` que devuelva `array['push', 'whatsapp']`. El respaldo de `pg_cron` revisa los consumidores de esa lista.
2. El cursor de `whatsapp` empieza en `pg_sequence_last_value('public.booking_events_id_seq')`, no en `max(id)` ni en 0 (ver la migración de F8): si empieza en 0, manda mensajes por todas las citas viejas.
3. `create or replace function private.notifications_backstop()` que además pida un despacho si hay `message_jobs` con `status = 'scheduled'` y `send_at <= now()`. Así los recordatorios salen con un desfase de 1 minuto como máximo, sin Vercel Cron.

Lo que F7 no tiene que hacer: otra ruta, otro cron, otro secreto ni otro trigger. El push sigue igual.

## Lo que no es evidente

### Despacho

- **Por qué `pg_net` y `pg_cron` y no Vercel Cron:** ver [docs/07](../docs/07-stack.md#decisiones-y-alternativas-descartadas). En resumen: aviso en segundos, sin depender del plan de Vercel (Hobby solo permite un cron al día), en una migración con pruebas, y cero llamadas con la barbería quieta.
- **El trigger es de `notifications` sobre una tabla de `booking`.** Solo lee (como un webhook de base de datos de Supabase); sin `notifications`, `booking` funciona igual. Es por sentencia: un aviso por transacción.
- **`pg_net` envía después del commit.** Encola la petición en `net.http_request_queue` dentro de la transacción; si la reserva se deshace, la petición también. El trigger nunca lanza: si Vault no tiene la URL o el secreto, no pide nada.
- **Huecos en `booking_events.id`.** Las transacciones pueden terminar en otro orden que sus ids. Si el cursor pasara un id que todavía no se ve, ese evento se perdería. `claim_booking_events` se para antes de un hueco reciente y lo salta cuando el evento siguiente tiene más de 2 minutos (transacción deshecha). **Consecuencia en local:** `pnpm db:test` deshace transacciones que gastan ids, así que después de correrlo el push se demora hasta 2 minutos. Por eso `pwa.spec` no exige `pending: false`, y por eso los cursores empiezan en `pg_sequence_last_value` y no en `max(id)`.
- **Turno (`lease_until`, 1 minuto).** Dos despachos a la vez no toman los mismos eventos: el segundo recibe `BUSY` y no llama a `ack` (soltaría el turno ajeno). Quien tiene el turno, al soltarlo, vuelve a mirar si quedan eventos, así que no se pierde ninguno. Si un despacho se cae con el turno, al minuto otro toma los mismos eventos.
- **Un push que falla no se repite** (repetirlo duplicaría el aviso en los otros celulares del barbero); una lectura de la base que falla, sí (`retry`). Los eventos de más de 12 horas no avisan.
- **Solo avisa lo que hizo el cliente:** reserva, cambio, cancelación y confirmación (la de F7). Lo que hace el personal no avisa, porque el barbero ya lo sabe. Con un solo barbero, que es el administrador, es lo mismo. Si un día el administrador crea citas para otro barbero, ese barbero no recibe aviso: habría que guardar quién hizo el cambio en el evento (versión 2 del contrato).
- **El aviso abre `/panel?dia=<día>&cita=<id>`**, no solo `?cita=`: así, al cerrar la hoja, "Hoy" queda en el día de la cita.
- **El `subject` de VAPID** debe ser `https:` o `mailto:`; en local el sitio es `http://localhost`, así que `pushSubject()` (`lib/business.ts`) usa el de producción. No se usa un correo para no exponer el de nadie.
- **`web-push` 3.6.7, no 4.0.0:** la 4 salió en noviembre de 2026, es solo ESM y no tiene tipos.

### Service worker

- **No se usa `SerwistProvider`:** con `cacheOnNavigation` (activo por omisión) guarda en caché cada página que se visita, incluidas las del panel con datos de clientes. El registro es propio y solo se guardan `/mis-citas` y `/mis-citas/<id>`.
- **El gancho `handlerDidError` de Serwist 9.5.15 no sirve fuera de producción:** después de obtener la respuesta de respaldo, lanza (`throw logger.log(...)` si `NODE_ENV !== "production"`). La pantalla sin conexión se arma envolviendo la estrategia (`withOfflinePage` en `sw.ts`).
- **Con `next dev` no hay precarga** (Serwist la apaga en desarrollo): sin conexión, la página guardada se ve pero sin estilos ni JavaScript. Para probar sin conexión de verdad: `next build && next start -p 3100`. La pantalla sin conexión sí se guarda también en desarrollo (el worker la pide al instalarse).
- **Precarga en producción:** 50 archivos de `.next/static` y `public` (1,4 MB), con las fuentes `woff2`, que el patrón por omisión de Serwist no incluye.
- **Versión nueva:** el worker nuevo espera (`skipWaiting: false`). La página lo detecta y muestra "Hay una versión nueva"; "Actualizar" le manda `SKIP_WAITING` y recarga en `controllerchange`. Si la persona lo ignora, entra la próxima vez que abra la app. La app instalada busca versión nueva cada vez que vuelve al frente. Como las páginas siempre vienen de la red cuando hay conexión, un worker viejo nunca muestra datos viejos; solo atrasa la lógica del propio worker.
- **El registro es `type: "module"`** porque Serwist compila el worker como ESM.

### Datos de un cliente sin conexión (regla 7)

- **Qué se guarda:** solo "Mis citas" y cada cita, en la caché `possos-privado`, sin la consulta de la URL. Las horas libres, reservar, cancelar, cambiar y el panel van siempre por la red.
- **Cuándo se borra:** en cada cambio de ruta, la página lee de la cookie de Supabase de quién es la sesión (sin red) y la compara con la última que guardó en `localStorage`. Si cambió (cerró sesión o entró otra cuenta), borra `possos-privado` y cancela la suscripción push de ese navegador. Solo decide con conexión: sin red, una sesión vencida parecería un cierre de sesión y borraría lo que se quiere ver.
- **`KeepOffline`** guarda la lista y las citas próximas aunque se abran con un enlace de la app (el worker solo guarda las navegaciones completas). Pide cada página al servidor otra vez: con 1 o 2 citas próximas es poco.
- **La suscripción que queda en la base** después de cancelarla en el navegador se borra sola la próxima vez que un aviso reciba 404 o 410.

### Avisos en "Más"

- **El permiso se lee con `pushManager.permissionState()`**, no con `Notification.permission`: el Chromium de Playwright devuelve `denied` en la segunda aunque el permiso esté concedido.
- **En iPhone, `PushManager` solo existe con la app instalada** (iOS 16.4 o posterior). En Safari la sección explica cómo instalarla.
- **Al abrir "Más" con avisos activos**, la página vuelve a guardar la suscripción: si en ese celular había entrado otra cuenta del personal, el endpoint pasa a la de ahora (`save_push_subscription`).
- **El Chromium de Playwright no puede suscribirse** a un servicio de push real. El envío se probó en local con un servicio falso (HTTPS local que descifra el aviso con las claves del suscriptor) y `NODE_EXTRA_CA_CERTS`; las pruebas automáticas cubren el armado (Vitest), el cursor (pgTAP) y la ruta (Playwright).

### Pruebas

- **El service worker está bloqueado en todas las pruebas de Playwright menos `pwa.spec`** (`serviceWorkers: "block"` en la configuración), para que las demás naveguen igual que antes de F8.
- **Lighthouse 12 ya no tiene la categoría PWA.** La instalabilidad se midió con Lighthouse 11.7.1 (PWA 100 %) y con `Page.getInstallabilityErrors` de Chrome (sin errores).
- **CI:** el job `e2e` ahora pasa `SUPABASE_SECRET_KEY` y `CRON_SECRET` de la base de CI, y genera claves VAPID desechables en cada corrida.
- `09_despacho.test.sql` crea sus propios secretos de Vault y un consumidor `prueba`; no depende de la semilla.

## Despliegue

- La migración se aplica con `pnpm db:push` después del CI en verde (primero `--dry-run`). **Entre el push del código y el `db:push`**, "Activar avisos" falla (la función `save_push_subscription` no existe) y la ruta de despacho responde con error; lo demás funciona. Las reservas de ese rato no avisan: la migración pone el cursor push después del último evento que ya existe, para no mandar avisos de citas viejas.
- La migración crea las extensiones `pg_net` y `pg_cron` y el trabajo `notifications-dispatch` (cada minuto). Hasta que Vault tenga la URL y el secreto, no llama a nada.

## Configurar en producción

Nada de esto va en el repo (regla 6).

1. **Claves VAPID.** Generarlas en el equipo de Juan:

   ```sh
   pnpm --filter @possos/notifications exec web-push generate-vapid-keys
   ```

   En Vercel (Production): `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (la pública) y `VAPID_PRIVATE_KEY` (la privada). Si se cambian después, todos los celulares tienen que volver a activar los avisos.
2. **Secreto del despacho.** `openssl rand -hex 32`. En Vercel (Production): `CRON_SECRET`.
3. **Vault de Supabase**, con el mismo secreto (SQL Editor del proyecto, o `pnpm exec supabase db query --remote`):

   ```sql
   select vault.create_secret('https://possos-web.vercel.app/api/notifications/dispatch', 'notifications_dispatch_url');
   select vault.create_secret('<el mismo CRON_SECRET>', 'notifications_dispatch_secret');
   ```

   Con el dominio propio (decisión 9), se cambia la URL con `vault.update_secret`.
4. Volver a desplegar en Vercel para que tome las variables.
5. Comprobar: una reserva de prueba y, en *Database > Extensions > pg_net* o con `select status_code from net._http_response order by id desc limit 5`, respuestas 200. Un 401 es un secreto distinto entre Vault y Vercel.

## Pendiente

- **De Juan:** las tres variables en Vercel, los dos secretos en Vault, el `db:push` y la lista de verificación en celulares reales de [F8-pwa-push.md](F8-pwa-push.md#lista-de-verificación-en-celulares-reales): instalar en iPhone y Android, push con la app cerrada (menos de 1 minuto), modo avión en "Mis citas", "Continuar con Google" dentro de la PWA instalada en iPhone ([riesgo 6](../docs/10-riesgos-decisiones-abiertas.md)) y la descarga del `.ics` desde la PWA de iOS (pendiente de F5).
- **Del dueño:** instalar la app en su celular y tocar "Activar avisos" en "Más"; el logo en SVG (decisión 11) para cambiar los íconos cuando llegue.
- **Para F7:** su consumidor `whatsapp`, ver [arriba](#cómo-se-conecta-f7-al-despacho).
- **Mejoras posibles, no pedidas:** que la app instalada lleve al personal directo al panel (hoy abre el inicio, con el enlace "Panel"), y avisar a un barbero de lo que el administrador hace en su agenda (contrato de eventos versión 2).
