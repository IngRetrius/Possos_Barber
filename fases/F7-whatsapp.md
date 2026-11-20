# F7. Recordatorios por WhatsApp

## Objetivo

Que cada cita reciba su confirmación y sus recordatorios por la Cloud API de Meta, que el cliente pueda confirmar o pedir el cambio con un botón, y que el barbero vea en la agenda si el mensaje llegó. Es la razón del proyecto ([docs/03](../docs/03-recordatorios-whatsapp.md)).

**Depende de:** F2, F5 y el trámite de Meta terminado (número, nombre visible y plantillas aprobadas). **Toca:** `packages/notifications` y las rutas `api/notifications/dispatch` (existe desde F8) y `api/whatsapp/webhook`. Antes de empezar, leer [F8-entrega.md](F8-entrega.md#cómo-se-conecta-f7-al-despacho).

## Tareas

### Plantillas

- [ ] Redactar `cita_confirmada`, `recordatorio_24h` y `recordatorio_2h` en español, categoría utilidad, sin nada promocional. Texto revisado por el dueño ([decisión 5](../docs/10-riesgos-decisiones-abiertas.md)).
- [ ] `cita_cancelada`, si el dueño lo aprueba ([decisión 7](../docs/10-riesgos-decisiones-abiertas.md)).
- [ ] Enviarlas a revisión y anotar la categoría que Meta les asignó.

### Programación

- [ ] Consumidor `whatsapp` de `booking_events` con su cursor en `event_cursors`, con el despacho de F8 (`EventConsumer` de `@possos/notifications/server`).
- [ ] `appointment.created` crea los `message_jobs` según `notification_settings`; no crea el de 24 h si faltan menos de 24 h.
- [ ] Cancelar o reprogramar pasa los trabajos pendientes a `skipped` (y la reprogramación crea los nuevos).
- [ ] Respeta `whatsapp_opt_in`.

### Despacho

- [ ] `dispatchDue()`: toma trabajos vencidos con `for update skip locked`, los pasa a `sending`, vuelve a leer la cita con `get_appointment_for_notification` y envía por HTTP a la Cloud API.
- [ ] Sin Vercel Cron (decisión de F8): `pg_cron` ya llama cada minuto a `/api/notifications/dispatch` con `CRON_SECRET` cuando hay algo pendiente. F7 agrega los `message_jobs` vencidos a esa revisión (`private.notifications_backstop()`) y `dispatchDue()` a la ruta.
- [ ] Reintentos con límite y `last_error`.

### Webhook

- [ ] Verificación del webhook (token) y validación de la firma `X-Hub-Signature-256` con el secreto de la app.
- [ ] Estados (`sent`, `delivered`, `read`, `failed`) a `message_jobs`.
- [ ] Botones: "Confirmo" llama a `confirmAppointment()`; "Necesito cambiarla" responde con el enlace a `/mis-citas/<id>`. Sin duplicados gracias a `inbound_messages.provider_message_id`.
- [ ] Mensajes de texto libre: respuesta de servicio con el enlace al WhatsApp del barbero.

### En la interfaz

- [ ] Estado del recordatorio en el detalle de la cita (F6) y marca en la agenda para teléfonos que fallan.
- [ ] En "Más", el costo estimado de WhatsApp del mes, calculado con el registro de mensajes.

## Criterios de aceptación

- Una cita reservada para mañana recibe la confirmación al instante y el recordatorio 24 h antes, con un desfase menor a 5 minutos.
- Tocar "Confirmo" deja la cita `confirmed` y la agenda del barbero lo muestra sin recargar.
- Una cita cancelada no recibe más recordatorios.
- Si el cron corre dos veces a la vez, ningún mensaje sale dos veces.
- Un webhook con firma inválida se rechaza con 401.
- Las plantillas quedaron aprobadas como **utilidad**.

## Pruebas

- Vitest del despacho con un cliente HTTP falso: envío, error, reintento y doble ejecución.
- Vitest del webhook con cargas reales de ejemplo de Meta (estados y botones) y firma.
- pgTAP: `get_appointment_for_notification` solo responde a la service role.
- Prueba manual con el número de prueba de Meta a un celular real antes de pasar al número definitivo.

## Necesita del dueño

- Número (A o B), confirmación inmediata sí o no, aviso de cancelación sí o no, y el texto de las plantillas.
- Dirección para `recordatorio_2h`.
