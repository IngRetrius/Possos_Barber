# Plantillas de WhatsApp para revisar

Borrador del 20/11/2026 para que el dueño lo revise antes de enviarlo a Meta. **Todavía no se envió nada a Meta.** Cuando el dueño apruebe o cambie un texto, se marca aquí y se envía desde el WhatsApp Manager (paso 3 de los [requisitos de Meta](../docs/03-recordatorios-whatsapp.md#requisitos-de-meta-antes-de-enviar-el-primer-mensaje)).

## Reglas que siguen todas

- **Categoría: utilidad.** Solo hablan de la cita: fecha, hora, servicio, barbero, dirección y los botones para confirmar o cambiar. Nada de descuentos, promociones, "trae a un amigo" ni invitaciones a comprar: con eso Meta las pasa a marketing, que cuesta unas 15 veces más ([docs/03](../docs/03-recordatorios-whatsapp.md#condición-para-mantener-ese-precio-plantillas-de-utilidad-no-de-marketing)).
- **Idioma: español (`es`).** Meta no tiene "español de Colombia"; el texto sí va con tuteo y sin emojis. El mensaje sale en español aunque el cliente use la app en inglés.
- **Variables.** `{{1}}`, `{{2}}`... las llena la app al mandar el mensaje. Meta no deja que el texto empiece ni termine con una variable, ni variables seguidas sin texto entre ellas: por eso cada una lleva texto alrededor.
- **El nombre de cada plantilla no se puede cambiar** después de crearla; el texto sí (pasa otra vez por revisión). Si el dueño cambia un texto, la app no cambia mientras las variables sigan en el mismo orden.
- Para la revisión, Meta pide un ejemplo de cada variable. Los de abajo sirven tal cual.

## Lo que falta decidir

| Qué | Quién | Hasta entonces |
|---|---|---|
| Aprobar o cambiar el texto de cada plantilla ([decisión 5](../docs/10-riesgos-decisiones-abiertas.md)) | Dueño | **[PENDIENTE]**: los textos de abajo son un borrador |
| El dominio del sitio para los botones con enlace ([decisión 9](../docs/10-riesgos-decisiones-abiertas.md)). Meta fija la parte inicial de la URL al crear la plantilla | Dueño y Juan | **[PENDIENTE]**. Con `possos-web.vercel.app` funciona, pero cambiar de dominio después obliga a editar las plantillas |
| Mandar `cita_confirmada` apenas se reserva ([decisión 6](../docs/10-riesgos-decisiones-abiertas.md), unos 3 COP más por cita) | Dueño | Sí (se apaga en "Configuración") |
| Mandar `cita_cancelada` cuando el barbero cancela ([decisión 7](../docs/10-riesgos-decisiones-abiertas.md)) | Dueño | **[PENDIENTE]**. Apagado en "Configuración" hasta que el dueño lo apruebe y Meta apruebe la plantilla |
| El botón "Cómo llegar" de `recordatorio_2h` | Dueño | Incluido en el borrador |
| El nombre del barbero que sale en los mensajes (el "nombre visible" de su perfil) | Dueño | El que tenga en "Barberos" |

## `cita_confirmada`

Sale apenas se reserva la cita (o cuando el barbero aprueba una reserva pendiente, o la cambia de hora).

**Cuerpo:**

```
Hola, {{1}}. Tu cita en Possos Barber quedó para el {{2}} a las {{3}}.

Servicio: {{4}}
Barbero: {{5}}

Si necesitas cambiarla o cancelarla, hazlo desde el botón.
```

**Botón** de enlace (URL dinámica): "Ver o cambiar mi cita" → `https://[PENDIENTE: dominio]/mis-citas/{{1}}`

| Variable | Qué es | Ejemplo para Meta |
|---|---|---|
| `{{1}}` | Primer nombre del cliente | Ana |
| `{{2}}` | Día | sábado 21 de noviembre |
| `{{3}}` | Hora | 3:00 p. m. |
| `{{4}}` | Servicio, con los adicionales | Corte normal + Barba |
| `{{5}}` | Barbero | Possos |
| Botón `{{1}}` | La cita | 1b2c3d4e-0000-4000-8000-000000000001 |

## `recordatorio_24h`

Sale 24 horas antes (el primer recordatorio de "Configuración"). No sale si la cita se reservó con menos de 24 horas.

**Cuerpo:**

```
Hola, {{1}}. Te recordamos tu cita en Possos Barber el {{2}} a las {{3}}.

Servicio: {{4}}

¿Nos confirmas que vienes? Si necesitas cambiarla, toca el botón.
```

**Botones** de respuesta rápida: "Confirmo" y "Necesito cambiarla". El texto de los botones debe quedar así: la app reconoce los dos.

| Variable | Qué es | Ejemplo para Meta |
|---|---|---|
| `{{1}}` | Primer nombre del cliente | Ana |
| `{{2}}` | Día | sábado 21 de noviembre |
| `{{3}}` | Hora | 3:00 p. m. |
| `{{4}}` | Servicio | Corte normal + Barba |

Lo que pasa con cada botón:

- **Confirmo:** la cita queda confirmada en la agenda del barbero (sin recargar) y el cliente recibe: "Listo, Ana. Tu cita del sábado 21 de noviembre a las 3:00 p. m. quedó confirmada. Te esperamos."
- **Necesito cambiarla:** el cliente recibe: "Aquí puedes cambiar la hora o cancelar tu cita: https://.../mis-citas/..." (con el límite de 2 horas de siempre).

Estas respuestas no son plantillas: son mensajes de servicio dentro de las 24 horas, que Meta no cobra hasta 1.000 al mes. Su texto está en `packages/notifications/src/internal/whatsapp-templates.ts` y también lo puede cambiar el dueño. **[PENDIENTE]**: su visto bueno.

## `recordatorio_2h`

Sale 2 horas antes (el segundo recordatorio de "Configuración"), solo si la cita sigue activa.

**Cuerpo:**

```
Hola, {{1}}. Tu cita en Possos Barber es a las {{2}}. Dirección: {{3}}. Te esperamos.
```

**Botón** de enlace (URL fija, opcional): "Cómo llegar" → `https://maps.app.goo.gl/3GL17XxTGt2TCffm8` (la ficha de Google Maps que dio el dueño el 19/11/2026).

| Variable | Qué es | Ejemplo para Meta |
|---|---|---|
| `{{1}}` | Primer nombre del cliente | Ana |
| `{{2}}` | Hora | 3:00 p. m. |
| `{{3}}` | Dirección | Manzana 26 Casa 13, barrio Kennedy, Girardot (casa esquinera naranja) |

## `cita_cancelada` (opcional)

Sale cuando el barbero o el administrador cancela una cita que no ha pasado, si "Avisar al cliente cuando el personal cancela su cita" está activo en "Configuración". Si cancela el cliente, no sale (ya lo sabe).

**Cuerpo:**

```
Hola, {{1}}. Tu cita en Possos Barber del {{2}} a las {{3}} fue cancelada. Puedes ver tus citas desde el botón.
```

**Botón** de enlace (URL fija): "Ver mis citas" → `https://[PENDIENTE: dominio]/mis-citas`

| Variable | Qué es | Ejemplo para Meta |
|---|---|---|
| `{{1}}` | Primer nombre del cliente | Ana |
| `{{2}}` | Día | sábado 21 de noviembre |
| `{{3}}` | Hora | 3:00 p. m. |

No lleva el motivo de la cancelación: lo escribe el personal y podría quedar algo que Meta lea como promoción.

## Texto libre

Si un cliente le escribe al número de los recordatorios, recibe una sola vez cada 12 horas:

```
Hola. Este número solo envía la confirmación y los recordatorios de las citas en Possos Barber, y nadie lee los mensajes que llegan aquí. Para escribirle al barbero: [su enlace de WhatsApp]
```

Si el barbero no tiene enlace de WhatsApp en su perfil, va el Instagram de la barbería. **[PENDIENTE]**: visto bueno del dueño.

## Después de la aprobación

Anotar aquí la categoría que Meta le asignó a cada plantilla y la fecha. Si alguna queda como marketing, no se usa: se cambia el texto y se envía otra vez.

| Plantilla | Enviada | Categoría de Meta | Estado |
|---|---|---|---|
| `cita_confirmada` | | | Sin enviar |
| `recordatorio_24h` | | | Sin enviar |
| `recordatorio_2h` | | | Sin enviar |
| `cita_cancelada` | | | Sin enviar |
