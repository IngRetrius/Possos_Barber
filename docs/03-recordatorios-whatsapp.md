# 03. Recordatorios por WhatsApp

Este documento explica por qué existe el proyecto. Investigado el 18/11/2026; fuentes en [fuentes.md](fuentes.md).

## Costo por mensaje

Desde el 1/7/2025, Meta cobra **por mensaje entregado**, según la categoría de la plantilla y el país de quien lo recibe. Un recordatorio de cita es una plantilla de **utilidad**.

| Proveedor | Precio | Costo por mensaje |
|---|---|---|
| Beunik (lo que paga el barbero) | 150.000 COP por 3.000 mensajes | **50 COP** |
| AgendaPro | 12.000 COP por 50 mensajes (desde 10.000) | **200 a 240 COP** |
| Meta Cloud API directa, utilidad, Colombia | US$0,0008 (tarifa del 1/10/2026, según sitios que copian la tabla de Meta) | **Unos 3 COP** |
| Meta Cloud API directa, marketing, Colombia | US$0,0125 | Unos 46 COP |

- **Pendiente:** confirmar la tarifa en la tabla oficial en COP de Meta. Meta factura en pesos colombianos desde el 1/4/2026, y la moneda se elige al crear la cuenta y no se puede cambiar. Conviene elegir **COP** para no depender del dólar.
- Los descuentos por volumen empiezan arriba de 100.000 mensajes al mes, así que no aplican aquí.
- **Desde el 1/10/2026**, las plantillas de utilidad se cobran aunque el cliente haya escrito en las últimas 24 horas. Antes eran gratis en esa ventana. Cada número tiene además **1.000 mensajes de servicio gratis al mes** (respuestas libres dentro de la ventana de 24 h). Con eso alcanza para contestar cuando el cliente toca un botón.

### Estimación mensual para un barbero

Supuestos: hasta 10 citas al día, 26 días al mes y 3 mensajes por cita (confirmación, recordatorio 24 h antes y recordatorio 2 h antes).

| | Mensajes al mes | Beunik (50 COP) | Meta directa (unos 3 COP) |
|---|---|---|---|
| Agenda llena | 780 | 39.000 COP | unos 2.300 COP |
| Media agenda | 390 | 19.500 COP | unos 1.200 COP |

El recordatorio sale **unas 15 veces más barato**. La comparación completa con Beunik tiene que sumar también la infraestructura del sitio, que se paga aparte.

## Condición para mantener ese precio: plantillas de utilidad, no de marketing

Meta revisa cada plantilla y la puede reclasificar como marketing si trae promociones, descuentos o invitaciones a comprar. Un mensaje de marketing cuesta unas 15 veces más, lo mismo que Beunik. Reglas:

- Las plantillas de recordatorio solo hablan de **la cita**: fecha, hora, servicio, barbero, dirección y botones de confirmar o cambiar.
- Nada de "aprovecha el 10 %" ni "trae a un amigo" dentro de un recordatorio.
- La solicitud de reseña en Google (fase 2) se revisa por separado, porque puede caer en marketing.

## Qué número envía los mensajes

**Decisión del dueño (19/11/2026): opción A.** Su número actual está en su cuenta personal y sigue siendo el contacto del barbero (el enlace `barbers.whatsapp_url`). Va a sacar un número nuevo solo para la API. El número personal no se escribe en el repo, que es público: se carga en el panel de administración.

Requisitos de la SIM nueva para la Cloud API: que pueda recibir el código de verificación por SMS o llamada, y que no esté registrada en ninguna app de WhatsApp (ni personal ni Business). Si se instala WhatsApp con ella, hay que borrar esa cuenta antes de registrarla en Meta.

| | **A. Número nuevo solo para la API** (recomendada para el MVP) | **B. Coexistencia con su número actual de WhatsApp Business** |
|---|---|---|
| Qué es | Una SIM nueva registrada directamente en la Cloud API de Meta. El barbero sigue usando su WhatsApp Business normal | Meta permite usar el mismo número en la app de WhatsApp Business y en la Cloud API a la vez; los chats se sincronizan |
| Ventaja | Sin intermediarios ni costos extra por mensaje. Se configura directamente en el WhatsApp Manager de Meta | El cliente recibe el recordatorio del número que ya conoce, y el barbero ve las respuestas en su app |
| Desventaja | El recordatorio llega de un número distinto. Si el cliente escribe algo que no es un botón, se le contesta con un enlace al WhatsApp del barbero | El alta se hace con el Embedded Signup de un **Tech Provider**: o se contrata un proveedor (que suele cobrar mensualidad o recargo) o se registra una app propia como Tech Provider ante Meta (más trámite). Hay limitaciones en la app, por ejemplo las listas de difusión quedan solo de lectura |
| Costo por mensaje | Tarifa de Meta | Tarifa de Meta más lo que cobre el proveedor, si se usa uno |

**Recomendación:** empezar con A, que es más rápida, sin intermediarios y con el costo más bajo. Pasar a B en la fase 2 si al barbero le molesta usar dos números. Los requisitos de la coexistencia (versión de la app, antigüedad del número, países) salen de documentación de proveedores, no de Meta; hay que confirmarlos antes de elegir B.

## Flujo de mensajes

```
Reserva creada ─▶ [utilidad] cita_confirmada         (inmediato)
                   "Tu cita en Possos Barber quedó para el jue 20/11 a las 3:00 p. m. ..."
                   Botón de enlace: Ver o cambiar mi cita

24 h antes ─────▶ [utilidad] recordatorio_24h
                   Botones de respuesta rápida: [Confirmo] [Necesito cambiarla]
                   ├─ Confirmo           → cita confirmed; respuesta de servicio: "Listo, te esperamos"
                   ├─ Necesito cambiarla → respuesta de servicio con el enlace para reprogramar o cancelar
                   └─ Sin respuesta      → la cita sigue booked ("Reservada"); al terminar cuenta como atendida

2 h antes ──────▶ [utilidad] recordatorio_2h   (solo si la cita sigue activa)
                   "Tu cita en Possos Barber es a las 3:00 p. m. Dirección: ..."

El personal cancela ▶ [utilidad] cita_cancelada  (opcional, decisión 7; apagado por omisión)

El cliente escribe ▶ respuesta de servicio (una cada 12 h): este número no lee mensajes,
                   con el enlace al WhatsApp del barbero

Al barbero: notificación push en la PWA (sin costo) por cada reserva, cambio o confirmación.
```

- Los momentos del recordatorio (24 h y 2 h) quedan en la configuración y el dueño los puede cambiar.
- Si una reserva se hace con menos de 24 h de anticipación, no se manda el recordatorio de 24 h.
- Cada mensaje queda registrado con su estado (en cola, enviado, entregado, leído, falló), que llega por webhook. La cita muestra si el recordatorio llegó. Un teléfono que falla se marca para que el barbero lo corrija.
- Un cliente puede pedir no recibir WhatsApp (`whatsapp_opt_in = false`). En ese caso no recibe mensajes (los avisos push de F8 son solo para el barbero).
- El borrador de las plantillas, para que el dueño lo revise antes de enviarlo a Meta, está en [F7-plantillas](../fases/F7-plantillas.md).

## Cómo está construido (F7)

Terminado en código el 20/11/2026 y probado contra una Graph API falsa; el detalle está en [F7-entrega](../fases/F7-entrega.md).

- **Sin intermediarios ni Vercel Cron.** El consumidor `whatsapp` del despacho de `booking_events` (F8) programa los mensajes en `message_jobs`; `pg_cron` revisa cada minuto si hay alguno vencido y llama a la ruta de despacho, que los manda por HTTP a la Cloud API (Graph API `v24.0`). Un recordatorio sale con un desfase de 1 minuto como máximo.
- **Ningún mensaje sale dos veces** aunque dos despachos corran a la vez (`for update skip locked`), y antes de mandar se vuelve a leer la cita: una cancelada, movida o pasada no recibe nada.
- **Webhook** en `/api/whatsapp/webhook`: verificación con token, firma `X-Hub-Signature-256`, estados, "Confirmo" (confirma la cita por la API de booking) y "Necesito cambiarla" (enlace a `/mis-citas/<id>`), sin duplicados.
- **En el panel:** el estado del último mensaje en la hoja de la cita, "El recordatorio falló" en la agenda y, en "Más", el costo estimado del mes con los mensajes entregados y su categoría de cobro.
- **Variables de entorno** (solo en Vercel, regla 6): `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET` y `WHATSAPP_WEBHOOK_VERIFY_TOKEN`. Sin las dos primeras no se programa ni se manda nada, y la app no promete "Te llega un WhatsApp".

## Requisitos de Meta antes de enviar el primer mensaje

1. Un portafolio de negocio en Meta Business, de la barbería, con un método de pago y la moneda en COP.
2. Una cuenta de WhatsApp Business Platform con el número (opción A o B) y el nombre visible "Possos Barber" aprobado.
3. Las tres plantillas aprobadas en español: `cita_confirmada`, `recordatorio_24h` y `recordatorio_2h` (y `cita_cancelada`, si el dueño la quiere). Borrador en [F7-plantillas](../fases/F7-plantillas.md).
4. El webhook configurado en la ruta `apps/web/app/api/whatsapp/webhook` (ver [07](07-stack.md)), que recibe los estados de los mensajes y las respuestas de los botones y valida la firma `X-Hub-Signature-256`. La ruta existe desde F7; los pasos para conectarla están en [F7-entrega](../fases/F7-entrega.md#configurar-en-producción-cuando-meta-esté-listo).
5. Verificar el negocio con Meta. Sin verificación hay un límite de mensajes iniciados por el negocio al día; según la documentación anterior, unos 250 clientes distintos en 24 horas, que alcanzan de sobra para un barbero. **Pendiente:** confirmar el límite actual.
