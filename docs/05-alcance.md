# 05. Alcance por fases

## Fase 1: MVP

La meta es que el barbero deje Beunik. Entra solo lo necesario para que reciba reservas, mande recordatorios baratos y lleve su agenda.

**Página pública** (sin iniciar sesión)
- Inicio con la marca, el botón "Reservar", los servicios con precio y duración, el barbero con su portafolio, la ubicación con mapa, el horario y los enlaces a Instagram y WhatsApp.
- Metadatos para búsquedas locales (datos estructurados de tipo `BarberShop`).
- Página de política de tratamiento de datos (Ley 1581).

**Cliente**
- Registro e inicio de sesión con Google o con correo y contraseña. Recuperar contraseña.
- Perfil con nombre y celular (obligatorio, para WhatsApp), autorización de tratamiento de datos y aceptación de recibir WhatsApp.
- Reservar en 4 pasos ([04](04-agendamiento.md)), con el paso del barbero oculto si hay uno solo.
- "Mis citas": próximas y pasadas, cancelar o reprogramar hasta 2 h antes, volver a reservar y agregar al calendario.

**Barbero**
- Agenda de día y de semana en el celular, con colores por estado ("Reservada", y "Confirmada" si el cliente tocó "Confirmo").
- Crear citas manuales para clientes con o sin cuenta.
- Aprobar o rechazar reservas pendientes.
- La cita que termina cuenta como atendida y registra sola el cobro del servicio con el precio de la reserva, que el barbero corrige ese día. El barbero solo marca "No vino" (20/11/2026; antes marcaba "Vino" o "No vino").
- Liquidación del periodo: servicios cobrados, total, su parte y la de la barbería según el porcentaje. Reemplaza las "facturas" de Beunik (decisión del 19/11/2026; ver [09](09-modelo-datos.md#commissions)).
- Horario semanal y bloqueos.
- Sus clientes: historial de citas y notas privadas.
- Notificaciones push de reservas, cambios, confirmaciones y cancelaciones.

**Administrador** (además de todo lo del barbero)
- Servicios: crear, editar, ordenar y desactivar.
- Barberos: crear, activar o desactivar, foto, biografía y portafolio.
- Configuración de la agenda y de los recordatorios.
- Todos los clientes; reiniciar el contador de inasistencias.
- Porcentaje de cada barbero, liquidación de todos y anular cobros.

**Recordatorios**
- WhatsApp por la Cloud API: confirmación, recordatorio de 24 h con botones y recordatorio de 2 h ([03](03-recordatorios-whatsapp.md)).
- Webhook de estados y de respuestas de botones; registro de cada mensaje.

**PWA**
- Instalable en Android y en iOS, con una guía de instalación para iOS (Compartir y luego "Agregar a inicio").
- Funciona sin conexión para la cáscara y "Mis citas" en caché. Para reservar se necesita conexión.

## Fase 2: retención y comodidad

- Lista de espera: si se libera una hora, se avisa a quienes la pidieron.
- Tarjeta de sellos ("10 cortes, 1 gratis"), contada sobre las citas `completed`.
- Pedir la reseña en Google después del corte (revisar su categoría en Meta).
- Coexistencia con el número actual de WhatsApp Business, si el dueño lo prefiere.
- Notificaciones push al cliente como canal adicional.
- Correo de confirmación y de recordatorio como respaldo.
- Verificar el celular con un código por WhatsApp (plantilla de autenticación, unos 3 COP).
- Vincular un cliente creado por el personal con la cuenta que la persona abra después, una vez verificado el celular.
- Importar clientes desde Beunik, si se puede exportar.
- Reportes simples: citas por semana, tasa de inasistencia y cortes recuperados por los recordatorios.

## Fase 3: si el negocio crece

- Anticipos o cobro por inasistencia con Wompi (Nequi, PSE y tarjetas), solo si los recordatorios no bastan.
- Gastos y reportes de ingresos más allá de la liquidación.
- Factura electrónica de la DIAN, si el negocio llega a necesitarla. **[PENDIENTE]** consultarlo con un contador.
- Varias sedes.
- Catálogo o tienda de productos.

## Fuera de alcance

- Marketplace o directorio de otras barberías.
- Mensajes de marketing masivos por WhatsApp.
- Apps nativas en las tiendas: la PWA cubre la necesidad.
- Imágenes generadas con IA para la marca, salvo que el dueño lo decida.
