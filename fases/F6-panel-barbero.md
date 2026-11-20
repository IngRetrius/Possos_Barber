# F6. Panel del barbero y del administrador

**Estado:** terminada en código el 19/11/2026 (parte A: agenda, citas, horario, bloqueos, festivos, servicios y barberos; parte B: cobros, liquidación, ficha del cliente, porcentajes, configuración y roles). Falta lo del dueño y la prueba en celulares reales. Lo que existe y lo que no es evidente está en [F6-entrega.md](F6-entrega.md).

## Objetivo

Que el barbero lleve su día desde el celular sin Beunik: ver la agenda, crear citas para quien escribe por WhatsApp o llega, aprobar reservas, marcar asistencia con su cobro, ver la liquidación y manejar su horario. El administrador, además, configura servicios, barberos y reglas. Sigue [docs/11](../docs/11-interfaz.md#pantallas-del-barbero) y [docs/06](../docs/06-roles-permisos.md).

**Depende de:** F2 y F3. **Toca:** `packages/booking`, `packages/barbers`, `packages/customers`, `packages/catalog`, `packages/commissions` (UI de staff) y la ruta `(staff)/panel`.

## Tareas

### Hoy y Semana

- [x] "Hoy": lista por hora con citas, horas libres, bloqueos y la línea de "ahora".
- [x] Encabezado con citas de hoy y sin confirmar. Secciones "Por cerrar" y "Pendientes de aprobar" solo cuando tienen algo.
- [x] Actualización en vivo con Postgres Changes sobre `appointments` filtrado por `barber_id`.
- [x] Selector de día (anterior y siguiente) y "Semana" con la ocupación de cada día.
- [x] `TabBar` con Hoy, Semana, Clientes y Más.

### Citas

- [x] Detalle en una hoja inferior: cliente, botón de WhatsApp, servicio, estado, estado del recordatorio (vacío hasta F7) y notas.
- [x] "No vino" con `markAttendance()`; "Aprobar" y "Rechazar" con `decidePending()`.
- [x] "Vino" abre la hoja de cobro ([docs/11](../docs/11-interfaz.md#cobro-al-marcar-vino)): valor prellenado y editable, reparto en vivo. Al guardar llama a `markAttendance()` y luego a `recordCharge()`. Si el cobro falla, la cita queda `completed` y aparece en "Por cerrar" como "Falta registrar el cobro".
- [x] Corregir el valor del cobro el mismo día desde el detalle de la cita.

### Liquidación

- [x] Pantalla en "Más" con periodo (hoy, semana, quincena, mes o rango), total cobrado, parte del barbero, parte de la barbería, número de servicios y la lista de cobros ([docs/11](../docs/11-interfaz.md#liquidación-en-más)).
- [x] El administrador elige el barbero o ve el total; el barbero solo ve la suya.
- [x] En la interfaz se llama "Cobros" y "Liquidación", nunca "Factura".
- [x] "Mover" y "Cancelar" (con motivo), sin la regla de 2 h.
- [x] "Nueva cita" en página completa: buscar cliente o crear uno con nombre, celular y la autorización dada de palabra; servicio y hora prellenados si viene de una hora libre. Llama a `staff_create_appointment`.

### Horario

- [x] Horario semanal con varios rangos por día.
- [x] Bloqueos: crear, ver y borrar. Si el bloqueo cae sobre citas, mostrar la lista para moverlas o cancelarlas.
- [x] Festivos de Colombia sugeridos como bloqueos para aceptar o no.

### Clientes

- [x] Lista de sus clientes con búsqueda, inasistencias y la marca de aprobación.
- [x] Ficha: historial de citas con él y notas privadas.

### Administrador (en "Más")

- [x] Servicios: crear, editar, ordenar y desactivar.
- [x] Barberos: crear, activar o desactivar, foto, biografía y portafolio (Storage).
- [x] Porcentaje de cada barbero (`commission_rates`) y anular cobros con motivo.
- [x] Configuración de la agenda (`booking_settings`) y de los recordatorios (`notification_settings`).
- [x] Todos los clientes y "Reiniciar inasistencias".
- [x] Asignar y quitar roles.

## Criterios de aceptación

- Al abrir el panel, la agenda de hoy se ve sin desplazarse ni tocar nada.
- Una reserva hecha por un cliente aparece en "Hoy" en menos de 3 segundos sin recargar.
- El barbero crea una cita para un cliente sin cuenta en menos de 30 segundos.
- Un barbero (no administrador) no ve clientes que nunca tuvieron cita con él.
- Marcar el segundo "No vino" deja al cliente con la marca de aprobación.
- Marcar "Vino" y guardar el cobro toma menos de 10 segundos.
- La liquidación del mes cuadra con la suma de los cobros no anulados, y barbero más barbería da el total.
- Cambiar el porcentaje no cambia la liquidación de periodos anteriores.

## Pruebas

- Playwright a 390 px con dos sesiones: el cliente reserva y la agenda del barbero se actualiza.
- Playwright: nueva cita manual, bloqueo encima de una cita, aprobar y rechazar.
- Playwright: "Vino" con cobro, corrección del valor y liquidación de la semana.
- pgTAP: los permisos de barbero frente a administrador de [docs/06](../docs/06-roles-permisos.md#matriz-de-permisos).

## Necesita del dueño

- Probar "Hoy" en su celular durante una jornada normal, en paralelo con Beunik, y decir qué le falta.
- Comparar una liquidación de prueba con la que le da Beunik para el mismo periodo.
