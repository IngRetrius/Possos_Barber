# 02. Comparativa de plataformas de agendamiento para barberías

Investigado el 18/11/2026. Las fuentes están en [fuentes.md](fuentes.md).

**Alcance y límites de la evidencia.** No se instalaron ni se probaron las apps. Los flujos y las funciones salen de las páginas de cada proveedor, y las quejas, de reseñas en Capterra, GetApp, Software Advice, Trustpilot y las tiendas de apps, tal como aparecen en esas páginas. Para Beunik y WeiBook no se encontraron reseñas escritas por usuarios. No se pudo contar con exactitud los pasos del flujo de reserva de cada app: la columna "flujo" describe lo que el proveedor publica.

## Plataformas revisadas

- **De uso en Colombia y Latinoamérica:** Beunik (Colombia), AgendaPro (Chile, con presencia fuerte en Colombia; dice tener más de 135.000 profesionales) y WeiBook (Colombia, fundada en 2021, presente en más de 12 países).
- **Internacionales de referencia:** Booksy (Polonia y EE. UU., fuerte en barberías), Fresha (Reino Unido), Squire (EE. UU., solo barberías) y theCut (EE. UU., solo barberos).
- **Mencionada, sin analizar a fondo:** Agendu (México), que también confirma por WhatsApp.

## Tabla comparativa

| | Beunik | AgendaPro | WeiBook | Booksy | Fresha | Squire | theCut |
|---|---|---|---|---|---|---|---|
| **Flujo de reserva** | Enlace o app: profesional, servicio, día y hora | Agenda en línea 24/7 sin llamar | Reserva en línea; el cliente cancela o reprograma solo | Perfil, servicio(s), profesional y hora. Exige registrarse y verificar el contacto. "Volver a reservar" en segundos | Reserva en línea con confirmaciones | Reserva 24/7, más citas por teléfono y clientes sin cita | El cliente busca al barbero y reserva; ve la política antes de confirmar |
| **Disponibilidad y asignación** | Agenda en tiempo real por profesional | Por profesional | Por profesional y sede | Por profesional; varios servicios en una cita | Por profesional, con lista de espera | Por barbero, con lista de espera | Por barbero (cada barbero es su propio negocio) |
| **Recordatorios** | WhatsApp, con confirmación del cliente | WhatsApp, SMS o correo, del mismo día hasta 3 días antes. Si el cliente no responde, le llega un WhatsApp para cancelar, cambiar o confirmar | WhatsApp nativo y asistente con IA (Wanda) que agenda y reprograma por WhatsApp | SMS 24 h antes y notificaciones push | SMS y correo, con frecuencia configurable | SMS y push (ilimitados en los planes altos) | Notificaciones de la app |
| **Costo de los mensajes** | Paquete de 3.000 por 150.000 COP (50 COP cada uno), según el barbero | 50 mensajes por 10.000 a 12.000 COP (200 a 240 COP cada uno). Algunos planes traen 50 o 100 de regalo | No publicado | Recordatorios incluidos | Antes gratis; ahora cobra por SMS, según las reseñas | Incluidos en los planes altos | Incluidos |
| **Cancelación, anticipos y pagos** | No publicados | Pagos registrados; anticipos no mencionados | Punto de venta, billetera y factura electrónica DIAN | Anticipos, tarjeta guardada y cobro automático por cancelación tardía | Anticipos y política propia (por ejemplo, 50 % si cancela el mismo día y 100 % si no llega). Bloquea reservas en línea a quien falta mucho | Pagos y propinas | Política de cancelación e inasistencia definida por el barbero; cobro solo con Mobile Pay y a criterio del barbero |
| **Fidelización** | Plan Oro: "premia y retiene" | Giftcards, encuestas y correo de cumpleaños (plan Premium) | Campos del cliente; pide reseñas en Google después de cada visita | Marketing (2.000 SMS al mes por miembro) | No evaluado | Recompensas, códigos promocionales y giftcards | No evaluado |
| **Lo que hace bien** | Pensado para Colombia; el cliente confirma por WhatsApp | Varios canales y respuesta automática por WhatsApp | Integración profunda con WhatsApp y factura DIAN | Marketplace fuerte en barberías; volver a reservar en un toque | Herramientas contra las inasistencias; muy bien calificada (4,9 en Google Play) | Atiende clientes sin cita y por teléfono | Muy fácil de usar; el barbero controla los cobros |
| **De qué se quejan** | No se encontraron reseñas escritas. Queja del barbero: se queda sin mensajes y el paquete extra es caro | Mensajes de WhatsApp en paquetes pequeños y caros | No se encontraron reseñas | Comisión del 30 % por clientes nuevos (Boost), pagos lentos y disputas por anticipos | Comisión del 20 % por clientes del marketplace que no se puede apagar, cobros que se suman, recordatorios que no salieron y peor soporte | Funciones bloqueadas hasta reclamar y poco interés del soporte | Fallas al cobrar la tarifa por inasistencia y soporte que no sabe explicar el error. Piden bloquear al cliente hasta que pague |

## Mejores ideas para Possos Barber

| # | Idea | Sale de | Fase |
|---|---|---|---|
| 1 | Recordatorio por WhatsApp con botones **Confirmo** y **Necesito cambiarla**, que cambian el estado de la cita | AgendaPro (WhatsApp para cancelar, cambiar o confirmar) y Beunik (el cliente confirma) | MVP |
| 2 | La agenda del barbero marca las citas **sin confirmar** para que las llame | Beunik (confirmaciones) | MVP |
| 3 | Política de cancelación visible **antes** de confirmar la reserva | theCut | MVP |
| 4 | Después de N inasistencias, la reserva en línea **pasa a requerir aprobación** | Fresha (bloqueo de reincidentes) y Booksy (aprobación por cliente) | MVP |
| 5 | **Volver a reservar** en un toque, con el mismo servicio y barbero | Booksy | MVP |
| 6 | El personal crea **citas manuales** para quien escribe por WhatsApp o llega sin cita | Squire (walk-ins y llamadas) | MVP |
| 7 | **Enlace y código QR** de reserva para la bio de Instagram, el perfil de WhatsApp Business y el mostrador | Beunik (enlace y QR) y Booksy (botones en Instagram) | MVP |
| 8 | **Registro de entrega** de cada mensaje (enviado, entregado, leído, falló), visible en la cita | Lección de las quejas contra Fresha (recordatorios que no salen) | MVP |
| 9 | Momento del recordatorio configurable por el dueño | AgendaPro (del mismo día hasta 3 días antes) | MVP |
| 10 | Portafolio de fotos por barbero | Beunik y Booksy | MVP |
| 11 | **Lista de espera:** avisar cuando se libera un hueco | Fresha y Squire | Fase 2 |
| 12 | Tarjeta de sellos ("10 cortes, 1 gratis") | Beunik Oro y Squire | Fase 2 |
| 13 | Pedir la reseña en Google después del corte (revisar si Meta lo clasifica como marketing) | WeiBook | Fase 2 |
| 14 | Cobro por inasistencia o anticipo, solo si los recordatorios no bastan | Booksy, Fresha y theCut | Fase 3 |

## Lo que se evita a propósito

- **Comisiones por cliente nuevo o por marketplace** (Booksy Boost 30 %, Fresha 20 %). El sitio es de la barbería y no cobra comisión.
- **Mensajes revendidos en paquetes** (Beunik y AgendaPro). Se paga la tarifa de Meta directamente.
- **Cobros automáticos por inasistencia** en el MVP. Causan muchas de las quejas (disputas, tarjetas que fallan) y el dueño no quiere anticipos por ahora.
