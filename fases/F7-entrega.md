# Entrega de F7

Estado de los recordatorios por WhatsApp al cerrar [F7](F7-whatsapp.md) en código, el 20/11/2026. **El trámite con Meta todavía no termina** (el número nuevo no tiene SIM, falta el portafolio de negocio con COP, y no hay token, número ni plantillas aprobadas). Todo lo que se puede probar sin Meta está hecho y probado contra una Graph API falsa; lo que falta está al final. Lo anterior sigue en [F0](F0-entrega.md) a [F8](F8-entrega.md); las reglas, en [CLAUDE.md](../CLAUDE.md).

## Qué existe

| Pieza | Dónde | Notas |
|---|---|---|
| Consumidor `whatsapp` | `packages/notifications/src/internal/whatsapp-consumer.ts` | Otro consumidor del despacho de F8 (`EventConsumer`), con su cursor en `event_cursors`. Crea y descarta `message_jobs`; no manda nada |
| Envío | `internal/whatsapp-dispatch.ts` (`dispatchDue`) | Toma lo vencido con `claim_message_jobs` y lo manda. Reintentos y `last_error` |
| Cliente HTTP | `internal/whatsapp-client.ts` (`WhatsAppClient`, `cloudApiClient`) | Cloud API directa, Graph API `v24.0`. Detrás de una interfaz: Vitest usa uno falso y Playwright una Graph API falsa |
| Plantillas y respuestas | `internal/whatsapp-templates.ts` | Nombres, parámetros en orden y los textos de servicio. El texto de las plantillas vive en Meta; el borrador para el dueño está en [F7-plantillas.md](F7-plantillas.md) |
| Webhook | `internal/whatsapp-webhook.ts` y `apps/web/app/api/whatsapp/webhook/route.ts` | GET de verificación, firma `X-Hub-Signature-256`, estados, botones y texto libre |
| Panel | `internal/whatsapp-status.ts` (`reminderSummary`, `whatsappCostEstimate`) | Puros. La app los muestra |
| `@possos/notifications` | `.`: `reminderSummary`, `reminderFailed`, `errorCodeOf`, `whatsappCostEstimate`, `WHATSAPP_PRICE_COP`, `TEMPLATES`, tipos. `/server`: `whatsappConsumer`, `planJobs`, `dispatchDue`, `messageJobStore`, `whatsappAppointmentLoader`, `getWhatsappSettings`, `cloudApiClient`, `whatsappSendConfigFromEnv`, `whatsappWebhookConfigFromEnv`, `handleWebhook`, `verifySignature`, `verifySubscription`, `whatsappWebhookStores`, `listMessageJobs`, `getWhatsappUsage` | `validateReminderSettings` recibe `sendCancellation` |
| `@possos/booking` | `/server`: `findAppointmentForPhone`. `/ui`: `AgendaList` recibe `warnings` | Únicos cambios en booking |
| Composición | `apps/web/lib/whatsapp.ts` (contexto, cliente, `whatsappRemindersEnabled`) y `lib/dispatch.ts` | La ruta de despacho corre los consumidores y después `dispatchDue` |
| Hoja de la cita | `(staff)/panel/_components/reminder-status.tsx` | "WhatsApp al cliente": último mensaje con su estado y el próximo |
| Agenda | `_components/agenda-view.tsx` | "El recordatorio falló" con ícono en la fila de la cita |
| "Más" | `(staff)/panel/mas/page.tsx` | Sección "WhatsApp" (solo el administrador): costo estimado del mes |
| "Configuración" | `_components/settings-forms.tsx` | Casilla "Avisar al cliente cuando el personal cancela su cita", apagada por omisión. El texto de arriba dice si los recordatorios ya salen |
| "Listo" de la reserva | `(customer)/reservar/listo/page.tsx` | "Te llega un WhatsApp..." solo con Meta configurado. `WHATSAPP_REMINDERS_ENABLED` de `lib/business.ts` ya no existe |
| Migraciones | `20261120130000_notifications_whatsapp.sql`, `20261120130100_booking_phone_lookup.sql` | Ver abajo. Cada función con su `revoke` y su `grant` (solo `service_role`) |
| Pruebas | `supabase/tests/database/11_whatsapp.test.sql` (45), Vitest en notifications (`whatsapp-client`, `-templates`, `-consumer`, `-dispatch`, `-webhook`, `-status`: 63 nuevas), `apps/web/e2e/whatsapp.spec.ts` (4) | `09_despacho` cambió: pone al día todos los cursores |

No se tocó `packages/ui` ni la restricción de exclusión de `appointments`.

### Migraciones

- `message_jobs`: `template` (la plantilla que se manda), `sent_at` (cuando Meta aceptó el mensaje; el costo del mes cuenta con esta fecha), `status_at` (último estado del webhook) y `pricing_category` (categoría con que Meta lo cobró).
- `notification_settings.send_cancellation` (false).
- El cursor `whatsapp` empieza en `pg_sequence_last_value`, como el de push: no programa mensajes de citas viejas.
- `private.notifications_consumers()` = `push` y `whatsapp`. `private.notifications_backstop()` además pide un despacho si hay trabajos de WhatsApp vencidos o colgados.
- `claim_message_jobs(limit)`, `finish_message_job(id, outcome, ...)` y `record_message_status(wamid, status, ...)`, solo `service_role`.
- `find_appointment_for_phone(phone)` (booking, solo `service_role`): la próxima cita activa de un celular, o la última.

## Cómo funciona

```
booking_events ──▶ consumidor whatsapp ──▶ message_jobs (scheduled)
   (F8: pg_net con cada evento, pg_cron cada minuto)
pg_cron cada minuto: ¿hay message_jobs vencidos? ──▶ /api/notifications/dispatch
   ruta: consumidores (push, whatsapp) y después dispatchDue()
dispatchDue: claim (sending) ─▶ vuelve a leer la cita ─▶ Cloud API ─▶ sent | retry | failed | skipped
Meta ──▶ /api/whatsapp/webhook: estados (delivered, read, failed) y botones
```

| Evento | Qué hace el consumidor |
|---|---|
| `appointment.created` (booked o confirmed) | Confirmación ya (si `send_confirmation`) y un trabajo por recordatorio de `reminder_offsets_min` cuya hora no haya pasado. El más lejano usa `recordatorio_24h` (botones); los demás, `recordatorio_2h` (dirección) |
| `appointment.created` (pending_approval) | Nada todavía |
| `appointment.status_changed` a `booked` desde `pending_approval` | Lo mismo que una cita nueva (aprobada) |
| `appointment.status_changed` a `rejected`, `completed` o `no_show` | Los pendientes pasan a `skipped` |
| `appointment.rescheduled` | Descarta lo de `rescheduled_from` y programa la nueva (con confirmación) |
| `appointment.cancelled` | Descarta lo pendiente. Si canceló el personal y `send_cancellation` está activo, `cita_cancelada` |

## Lo que no es evidente

### Programar

- **Antes de programar se vuelve a leer la cita** (`get_appointment_for_notification`). Un evento viejo de una cita que después se canceló no programa nada, y `whatsapp_opt_in` y el celular se respetan con el valor de ese momento. Al mandar se vuelven a revisar las dos cosas.
- **Sin token o sin número de Meta, el cursor avanza sin programar** (como push sin claves VAPID). Al conectar Meta, solo las citas reservadas desde entonces reciben mensajes. Si se quiere recordar las citas que ya estaban, hay que programarlas a mano (no está hecho).
- **La confirmación solo sale si el evento tiene menos de 2 horas** (`CONFIRMATION_MAX_AGE_MS`): después de una caída larga, "Tu cita quedó para..." no tiene sentido. Los recordatorios sí se programan.
- **Entrega al menos una vez:** un evento visto dos veces no duplica nada. Los trabajos son únicos por (cita, tipo, minutos, canal) y se insertan con `on conflict do nothing`; descartar es idempotente.
- La plantilla se elige al programar y queda en `template`: si el dueño cambia los recordatorios después, las citas ya programadas siguen con lo que tenían. "Configuración" lo dice.

### Mandar

- **`for update skip locked` y `sending`:** `claim_message_jobs` pasa los trabajos a `sending` en la misma sentencia que los bloquea. Un segundo despacho a la vez salta las filas bloqueadas y, después del commit, ya no las ve como `scheduled`. Vitest corre dos `dispatchDue` en paralelo sobre 25 trabajos: 25 envíos, ninguno doble. pgTAP revisa que una segunda llamada no devuelve nada.
- **Trabajos colgados:** uno en `sending` por más de 5 minutos quedó de un despacho que se cayó (la ruta tiene 60 s) y se vuelve a tomar. Si el envío llegó a Meta justo antes de la caída, ese mensaje sale dos veces; se prefirió eso a perder el recordatorio, que es la razón del proyecto. Un despacho que llega tarde no pisa la fila: `finish_message_job` solo cambia filas en `sending`.
- **Reintentos:** 5 intentos con esperas de 1, 5, 15 y 30 minutos, nunca después de la hora de la cita. Se reintenta la red, los 5xx, el 429 y los códigos de Meta de servicio, límite de envío y token (`isRetryableCode`); un número sin WhatsApp (131026), una plantilla inexistente o un parámetro inválido fallan de una vez. `last_error` queda como `131026: Message undeliverable`, sin datos del cliente.
- **Lo que se descarta y por qué** queda en `last_error` de la fila `skipped`: `INACTIVE`, `TOO_LATE`, `OPTED_OUT`, `NO_PHONE`, `NOT_FOUND`, `APPOINTMENT_CHANGED` (la cita se movió o se canceló) y `NOT_CONFIGURED` (Meta no estaba configurado al vencer; así el respaldo de `pg_cron` no insiste cada minuto).
- **Parámetros:** Meta rechaza saltos de línea, tabulaciones, más de 4 espacios seguidos y parámetros vacíos; `cleanParam` los deja en una línea. El saludo usa el primer nombre. La hora lleva espacios normales, no el espacio fijo de `formatTime`.
- **`to` va sin el `+`** (`573001234567`), como lo usa la Cloud API.

### Webhook

- **La firma se calcula sobre los bytes tal como llegaron**, antes de leerlos como JSON (`request.arrayBuffer()`): Meta escapa los caracteres no ASCII y leer y volver a serializar cambiaría el cuerpo. Sin firma válida, 401. Sin `WHATSAPP_APP_SECRET` o `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, 503.
- **Si la base falla, la ruta responde 500 para que Meta reintente.** Meta repite el aviso durante días; los estados son idempotentes y los mensajes se registran por su id en `inbound_messages` antes de procesarlos. Si procesar falla (por ejemplo, confirmar), el registro se borra para que el reintento lo procese. Un reintento de algo que ya salió bien responde `duplicates: 1` y no confirma ni contesta otra vez.
- **Los estados solo avanzan** (`record_message_status`): `read` antes que `delivered`, o un `sent` tarde, no hacen retroceder. `failed` solo cuenta si el mensaje no se había entregado. La categoría de cobro (`pricing.category`) se guarda siempre.
- **Botones:** el payload es `confirm:<cita>` o `change:<cita>` y lo pone la app al mandar `recordatorio_24h`. Si Meta no lo trae, se reconoce el texto del botón ("Confirmo", "Necesito cambiarla") y la cita sale del mensaje original (`context.id` → `message_jobs.provider_message_id`). **El celular que toca el botón tiene que ser el de la cita**; si no, no se confirma nada.
- **"Confirmo" llama a `confirmAppointment(..., via: "whatsapp")` de booking** (regla 4 de docs/08). Una cita cancelada o pasada contesta "Esa cita ya no está activa" con el enlace a "Mis citas". La confirmación publica `appointment.status_changed`: la agenda se actualiza sola (Realtime de F6) y el barbero recibe el push "Cita confirmada" (F8).
- **Texto libre:** una respuesta cada 12 horas por celular con el WhatsApp del barbero de su cita (o el Instagram de la barbería). La cita sale del mensaje al que contesta o de `find_appointment_for_phone`. Las respuestas de servicio son gratis dentro de las 24 h (hasta 1.000 al mes).
- **Solo se procesan los cambios de `messages` del número de `WHATSAPP_PHONE_NUMBER_ID`.** Los de plantillas (`message_template_status_update`) se ignoran por ahora.
- El webhook no pasa por `proxy.ts` (como la ruta de despacho).

### Panel

- **El estado de la hoja** sale de `reminderSummary`: el último mensaje que se intentó mandar (por hora de envío) y el próximo programado. "Revisa el número" solo con los errores que apuntan al número (131026, 131021 y 131030, el de la lista de números de prueba de Meta). Sin mensajes (el cliente no aceptó WhatsApp, o Meta no está conectado) no se muestra nada.
- **El estado no se actualiza en vivo**: Realtime escucha `appointments`, no `message_jobs`. Se ve al abrir la hoja o con el siguiente refresco de la agenda (cualquier cambio de cita, o volver a la pestaña).
- **El costo del mes** cuenta los mensajes entregados o leídos por `sent_at` (Meta cobra por mensaje entregado, desde el 1/7/2025) por el precio de `WHATSAPP_PRICE_COP`: unos 3 COP en utilidad y unos 46 en marketing, de [docs/03](../docs/03-recordatorios-whatsapp.md). **Falta confirmar la tarifa en la tabla oficial en COP**; cuando esté, se cambia esa constante. Si algún mensaje aparece cobrado como marketing, "Más" lo avisa: Meta reclasificó una plantilla ([riesgo 1](../docs/10-riesgos-decisiones-abiertas.md)).

### Pruebas

- **Playwright no habla con Meta.** `e2e/support/whatsapp.ts` levanta una Graph API falsa en el puerto de `WHATSAPP_API_URL` (`http://127.0.0.1:3901`) y firma cargas con la forma de los ejemplos de Meta. La app manda de verdad por HTTP; solo cambia la URL.
- **Variables de prueba:** en CI se generan en cada corrida (paso "WhatsApp de prueba" del job `e2e`). En local van en `apps/web/.env.local` con valores desechables (ver [README](../README.md#desarrollo-local)). Con ellas, la app local se comporta como si Meta estuviera conectado: "Listo" dice "Te llega un WhatsApp" y las reservas de otras pruebas también programan mensajes, que fallan contra el puerto cerrado y se descartan solos tras los reintentos.
- `whatsapp.spec` espera la confirmación hasta 150 s: después de `pnpm db:test`, el cursor puede esperar 2 minutos ante un hueco de ids (F8).
- La prueba manual con el número de prueba de Meta a un celular real queda para cuando exista la cuenta (abajo).

## Despliegue

- Las dos migraciones se aplican con `pnpm db:push` después del CI en verde (primero `--dry-run`). Sin ellas, la ruta de despacho falla al llamar a `claim_message_jobs` y "Configuración" no guarda los recordatorios (falta la columna). **Sin las variables de Meta no cambia nada visible para el cliente:** el cursor avanza sin programar y "Listo" no promete WhatsApp.

## Configurar en producción (cuando Meta esté listo)

Ningún valor va en el repo ni en el chat (regla 6). Los nombres están en `.env.example`.

1. **En Meta** (cuando el portafolio de negocio con COP, el número nuevo y el nombre visible "Possos Barber" estén aprobados, [docs/03](../docs/03-recordatorios-whatsapp.md#requisitos-de-meta-antes-de-enviar-el-primer-mensaje)):
   - Crear un usuario del sistema en el portafolio de negocio, con un token permanente y los permisos `whatsapp_business_messaging` y `whatsapp_business_management`.
   - Anotar el **Phone number ID** del número (WhatsApp Manager > API Setup). No es el número.
   - Copiar el **secreto de la app** (App settings > Basic).
   - Enviar las plantillas de [F7-plantillas.md](F7-plantillas.md) que el dueño haya aprobado y anotar la categoría que asigne Meta.
2. **En Vercel** (Production, todas como sensibles):
   - `WHATSAPP_ACCESS_TOKEN`: el token del usuario del sistema.
   - `WHATSAPP_PHONE_NUMBER_ID`.
   - `WHATSAPP_APP_SECRET`.
   - `WHATSAPP_WEBHOOK_VERIFY_TOKEN`: generarlo con `openssl rand -hex 32`.
   - `WHATSAPP_API_URL` **no se pone** (es solo para pruebas).
3. Volver a desplegar.
4. **Webhook en Meta** (App > WhatsApp > Configuration): URL `https://<dominio>/api/whatsapp/webhook`, el mismo token de verificación, y suscribir el campo `messages`. Meta hace el GET de verificación al guardar: si responde 403, el token no coincide; si responde 503, faltan variables en Vercel.
5. **Comprobar** con el número de prueba de Meta a un celular real antes de pasar al número definitivo: una reserva para mañana, la confirmación al instante, el recordatorio de 24 h (se puede probar con una cita a 24 h y unos minutos), tocar "Confirmo" y ver la agenda, cancelar y comprobar que no llega nada más, y escribir un texto libre. En "Más", el mes debe contar los entregados.

## Pendiente

- **De Meta (Juan y el dueño):** la SIM del número nuevo, el portafolio de negocio con moneda COP y método de pago, el nombre visible, las plantillas aprobadas como **utilidad**, la verificación del negocio, el token y el webhook (arriba). Confirmar la tarifa en la tabla oficial en COP y cambiar `WHATSAPP_PRICE_COP` si difiere.
- **Del dueño:** aprobar o cambiar el texto de las plantillas y de las respuestas ([F7-plantillas.md](F7-plantillas.md)), decidir si se avisa la cancelación (decisión 7) y el dominio (decisión 9), que fija la URL de los botones.
- **Prueba manual** con el número de prueba de Meta (paso 5 de arriba) y los criterios de aceptación que dependen de Meta: el desfase menor a 5 minutos con mensajes reales y las plantillas aprobadas como utilidad.
- **Mejoras posibles, no pedidas:** el estado del mensaje en vivo en la hoja (Realtime sobre `message_jobs`), programar los recordatorios de las citas que ya existían al conectar Meta, y registrar los cambios de categoría de las plantillas que manda Meta por el webhook (`message_template_status_update`, `template_category_update`).
