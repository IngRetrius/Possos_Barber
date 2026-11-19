# 01. Análisis de Beunik

Investigado el 18/11/2026 a partir de beunik.co, negocios.beunik.co y las fichas de la App Store. No se usaron las apps con una cuenta. Los flujos descritos vienen del material de Beunik. El 19/11/2026 el dueño compartió capturas del inicio de Beunik PRO; lo que muestran está en [11](11-interfaz.md#beunik-lo-que-muestran-las-capturas-del-dueño). Ahí aparece el plan "Básico - Individual", que no coincide con los nombres publicados abajo. **Pendiente:** capturas del flujo de reserva del cliente.

## Qué es

Beunik (BEUNIK SAS, Colombia) tiene dos apps:

- **Beunik: Reservas en belleza**, para clientes. Funciona como marketplace de barberías, peluquerías, spas de uñas y estudios de cejas y pestañas. Es gratis para el cliente. En la App Store de EE. UU. tiene 4,9 de 5 con 54 valoraciones.
- **Beunik PRO**, para negocios: agenda, recordatorios, finanzas y comisiones. No tiene suficientes reseñas para mostrar calificación.

## Planes de Beunik PRO (según beunik.co el 18/11/2026)

| Plan | Individual | Dúo | Grupal |
|---|---|---|---|
| Plata | 64.900 COP | 94.900 COP | 124.900 COP |
| Oro | 99.900 COP | 144.900 COP | 189.900 COP |

- La página negocios.beunik.co muestra otra versión (Individual 44.900 y Grupal 64.900). El barbero dice que paga un plan de unos 50.000 COP.
- **La página no publica cuántos recordatorios de WhatsApp trae cada plan ni el precio de los mensajes extra.** El dato de 150.000 COP por 3.000 mensajes viene del barbero.
- Hay prueba gratis de 2 semanas, sin permanencia.

## Lado del cliente

| Función | Qué hace en Beunik | Para Possos Barber |
|---|---|---|
| Catálogo de servicios con precios | Menú completo con precios actualizados | **Adoptar.** Lista de servicios con precio y duración |
| Ver el trabajo de los profesionales | Comparar barberos y estilistas por su trabajo | **Adaptar.** Perfil y portafolio de cada barbero de la casa, sin comparar entre negocios |
| Agenda en tiempo real | Ver la agenda del profesional y reservar un hueco | **Adoptar.** Horarios libres calculados en la base de datos y actualizados con Realtime |
| Reservar sin llamar ni escribir | Reserva directa en la app | **Adoptar**, con la regla del dueño: solo usuarios registrados |
| Reputación del profesional y del negocio | Reseñas en la app | **Descartar** en el MVP. En la fase 2 se pide la reseña en Google, que es donde buscan los clientes nuevos |
| Descubrir negocios cerca y comparar precios | Marketplace | **Descartar.** Possos Barber es un solo negocio |
| Compartir la página del negocio | Enlace para compartir | **Adoptar.** Enlace y código QR para la bio de Instagram y el mostrador |

## Lado del negocio (Beunik PRO)

| Función | Plan | Para Possos Barber |
|---|---|---|
| Agenda digital por profesional | Plata | **Adoptar.** Vista de día y de semana, pensada primero para el celular |
| Reservas en línea (sitio web) | Plata | **Adoptar.** Es el producto |
| "Agendamiento en WhatsApp: link directo y sincronizado" | Plata | **Adaptar.** Enlace a la PWA en el perfil de WhatsApp Business y en Instagram |
| Recordatorios automáticos por WhatsApp; "el cliente confirma su reserva" | Plata | **Adoptar y mejorar.** Cloud API directa (unos 3 COP por mensaje frente a 50) y botones para confirmar o cambiar la cita. Ver [03](03-recordatorios-whatsapp.md) |
| Clientes centralizados | Plata | **Adoptar**, con la regla de que cada barbero solo ve a sus clientes |
| Historial de clientes | Oro | **Adaptar.** Historial de citas y notas privadas del barbero desde el MVP |
| Control de ingresos y gastos | Plata | **Descartar** en el MVP. Fase 3, si el dueño lo pide |
| Cálculo de comisiones de colaboradores ("Facturas" en la app) | Plata | **Adoptar en el MVP.** Según el dueño (19/11/2026), solo reparte el valor de cada servicio entre el barbero y la barbería con un porcentaje que fija el administrador. La usa: su cuenta muestra 652. Ver [09](09-modelo-datos.md#commissions) |
| Fidelización ("premia y retiene a tus clientes") | Oro | **Adaptar** en la fase 2: tarjeta de sellos simple |
| Marketing automatizado ("mensajes que venden por ti") | Oro | **Descartar.** En Colombia, un mensaje de marketing por WhatsApp cuesta unas 15 veces más que uno de utilidad, y si los clientes lo reportan como spam pueden bloquear el número |
| Horarios, bloqueos y confirmaciones | Plata | **Adoptar.** Horario semanal, descansos, días bloqueados y estado "confirmada" |
| Código QR para la próxima cita | Plata | **Adoptar.** Mismo QR del perfil |

## Flujos principales (según el material de Beunik)

**Cliente:** abre el enlace o la app, elige el negocio, el profesional y el servicio, luego el día y la hora, y confirma. Antes de la cita le llega un WhatsApp para confirmarla.

**Negocio:** configura servicios, profesionales y horarios; recibe las reservas en la agenda; los recordatorios salen solos y la agenda muestra quién confirmó; al final registra ingresos y liquida comisiones.

## Lo que se aprende de Beunik

1. **El modelo de cobro por paquetes de mensajes es el punto débil para este barbero.** Un recordatorio le cuesta a Beunik unos 3 COP con Meta y se lo revende a 50 COP. Esa diferencia es la razón del proyecto.
2. El cliente ya está acostumbrado a reservar por enlace y a recibir un WhatsApp para confirmar. El sitio nuevo debe parecerse para que el cambio no le cueste.
3. Beunik mezcla marketplace con herramienta de negocio. Possos Barber solo necesita la herramienta, así que el producto queda más simple.
