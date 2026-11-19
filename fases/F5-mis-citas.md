# F5. Mis citas

## Objetivo

Que el cliente vea su próxima cita, la cambie o la cancele dentro de la política de 2 horas, y vuelva a reservar con un toque. También es el destino de los enlaces de los WhatsApp de F7.

**Depende de:** F4. **Toca:** `packages/booking` (UI y servidor) y la ruta `(customer)/mis-citas`.

## Tareas

- [ ] Próxima cita en una tarjeta con "Cambiar hora" y "Cancelar".
- [ ] Pasado el límite de `cancel_window_min`, los botones se reemplazan por "Escríbele al barbero" (enlace a `barbers.whatsapp_url`).
- [ ] Cancelar en una hoja inferior con la fecha y hora completas; llama a `cancel()`.
- [ ] Cambiar hora: abre el paso de horario del flujo de F4 con el servicio y el barbero ya puestos; al confirmar llama a `reschedule()`. Si la hora nueva se ocupó, la cita original sigue igual.
- [ ] Citas pasadas con su estado y "Volver a reservar".
- [ ] Citas `pending_approval` con su aviso; `rejected` y `cancelled` visibles en el historial con su texto.
- [ ] Archivo `.ics` de la cita, con la hora en `America/Bogota` y la dirección.
- [ ] Enlace directo a una cita (`/mis-citas/<id>`) que piden los botones de WhatsApp. Si no hay sesión, pide ingresar y vuelve.
- [ ] Estado vacío: "Todavía no tienes citas" y "Reservar".

## Criterios de aceptación

- Un cliente cancela una cita a más de 2 h y la hora vuelve a aparecer libre en el flujo de reserva.
- A menos de 2 h, el cliente no ve los botones, y si llama a la función por fuera de la interfaz recibe `TOO_LATE_TO_CANCEL`.
- Cambiar la hora deja una sola cita activa, enlazada por `rescheduled_from`.
- "Volver a reservar" llega al paso de horario sin preguntar de nuevo servicio ni barbero.
- El `.ics` se importa bien en el calendario de iOS y en Google Calendar.

## Pruebas

- Playwright a 390 px: cancelar, cambiar hora, volver a reservar y abrir el enlace directo sin sesión.
- Vitest del generador de `.ics` (zona horaria, escapes y fin de la cita).
