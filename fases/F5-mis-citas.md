# F5. Mis citas

## Objetivo

Que el cliente vea su próxima cita, la cambie o la cancele dentro de la política de 2 horas, y vuelva a reservar con un toque. También es el destino de los enlaces de los WhatsApp de F7.

**Depende de:** F4. **Toca:** `packages/booking` (UI y servidor) y la ruta `(customer)/mis-citas`.

## Tareas

- [x] Próxima cita en una tarjeta con "Cambiar hora" y "Cancelar".
- [x] Pasado el límite de `cancel_window_min`, los botones se reemplazan por "Escríbele al barbero" (enlace a `barbers.whatsapp_url`).
- [x] Cancelar en una hoja inferior con la fecha y hora completas; llama a `cancel()`.
- [x] Cambiar hora: abre el paso de horario del flujo de F4 con el servicio y el barbero ya puestos; al confirmar llama a `reschedule()`. Si la hora nueva se ocupó, la cita original sigue igual.
- [x] Citas pasadas con su estado y "Volver a reservar".
- [x] Citas `pending_approval` con su aviso; `rejected` y `cancelled` visibles en el historial con su texto.
- [x] Archivo `.ics` de la cita, con la hora en `America/Bogota` y la dirección.
- [x] Enlace directo a una cita (`/mis-citas/<id>`) que piden los botones de WhatsApp. Si no hay sesión, pide ingresar y vuelve.
- [x] Estado vacío: "Todavía no tienes citas" y "Reservar".

## Criterios de aceptación

- Un cliente cancela una cita a más de 2 h y la hora vuelve a aparecer libre en el flujo de reserva.
- A menos de 2 h, el cliente no ve los botones, y si llama a la función por fuera de la interfaz recibe `TOO_LATE_TO_CANCEL`.
- Cambiar la hora deja una sola cita activa, enlazada por `rescheduled_from`.
- "Volver a reservar" llega al paso de horario sin preguntar de nuevo servicio ni barbero.
- El `.ics` se importa bien en el calendario de iOS y en Google Calendar.

## Pruebas

- Playwright a 390 px: cancelar, cambiar hora, volver a reservar y abrir el enlace directo sin sesión.
- Vitest del generador de `.ics` (zona horaria, escapes y fin de la cita).

## Cierre (19/11/2026)

Terminada en código. Lo construido y lo que no es evidente está en [F5-entrega.md](F5-entrega.md).

- Los cinco criterios de aceptación tienen prueba, salvo la importación del `.ics` en el calendario de iOS y en Google Calendar, que se prueba en un celular real (ver la entrega). En Vitest se prueban la zona horaria, los escapes y el fin de la cita.
- Una migración nueva, `20261119170000_booking_my_appointments.sql` (`list_my_appointments`), con su prueba pgTAP `08_mis_citas` (19 aserciones).
- `CUSTOMER_HOME` sigue siendo el inicio; el inicio ganó el acceso "Mis citas" y la tarjeta de la próxima cita lleva a ella.
