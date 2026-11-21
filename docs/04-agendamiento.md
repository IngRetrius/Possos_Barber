# 04. Agendamiento

Contiene las reglas de la agenda, con los valores que decidió el dueño el 18/11/2026. Los valores numéricos viven en la tabla `booking_settings` ([09](09-modelo-datos.md)) para que se puedan cambiar sin tocar código.

## Reglas configurables

| Regla | Valor inicial | Fuente |
|---|---|---|
| Duración del corte normal | 60 min | Dueño |
| Intervalo entre horas de inicio | 60 min (en punto) | Dueño ("por ahora de 1 hora") |
| Anticipación mínima para reservar | 60 min | Propuesta aceptada por omisión |
| Anticipación máxima | 30 días | Propuesta aceptada por omisión |
| Límite para cancelar o reprogramar | Hasta 2 h antes | Dueño |
| Inasistencias antes de exigir aprobación | 2 | Dueño |
| Recordatorios | 24 h y 2 h antes | Propuesta ([03](03-recordatorios-whatsapp.md)) |
| Zona horaria | America/Bogota (UTC-5, sin horario de verano) | Fija |

## Flujo del cliente (mínimo 4 pasos)

1. **Servicio.** Lista con nombre, duración y precio.
2. **Barbero.** Las opciones son los barberos que hacen ese servicio, más "Cualquiera disponible". **Si hay un solo barbero activo, el paso se salta.**
3. **Horario.** Una tira de días (hoy y los siguientes) y debajo las horas libres de ese día. Las horas las calcula la función `get_available_slots` en la base de datos y se actualizan con Realtime si alguien toma una mientras el cliente mira.
4. **Confirmar.** Muestra el resumen y **la política de cancelación**, y tiene el botón "Reservar". Si el cliente no ha iniciado sesión, en este paso se le pide registrarse y después vuelve al resumen sin perder lo que eligió.

Al reservar se muestra la cita creada, un botón para agregarla al calendario (en iPhone, iPad y Mac, el archivo .ics, que se abre en Calendario; en Android y lo demás, Google Calendar con la cita llena) y, si la app no está instalada, la invitación a instalarla.

**Desde el inicio:** cada servicio muestra sus próximas horas libres; tocar una lleva directo a "Confirmar", así que la reserva toma 3 toques (abrir el servicio, la hora y "Reservar"). Para otro día, "Ver todas las horas" abre el paso de horario.

**Volver a reservar:** en "Mis citas", cada cita pasada tiene un botón que abre el flujo con el servicio y el barbero ya elegidos.

## Cualquiera disponible

Lo resuelve la función `book_appointment` al reservar, no la interfaz:

1. Toma los barberos activos que hacen el servicio y están libres en ese horario.
2. Elige al que tenga **menos citas activas ese día**.
3. Si hay empate, elige al que hace más tiempo no recibe una asignación de "cualquiera" (rotación).

## Estados de la cita

```
                  ┌──────────── cancelled (by customer | by staff)
                  │
pending_approval ─┼─▶ booked ──▶ confirmed ──▶ completed (sola, al terminar)
   (cliente con   │      │            │              │
   2+ faltas)     │      └────────────┴──────────────┴──▶ no_show ("No vino")
                  └─▶ rejected
```

| Estado | Significado | Ocupa el horario |
|---|---|---|
| `pending_approval` | La reservó un cliente que necesita aprobación; espera al barbero | Sí |
| `booked` | Reservada y vigente. La interfaz dice "Reservada" (desde el 20/11/2026; antes, "Sin confirmar") | Sí |
| `confirmed` | El cliente tocó "Confirmo" en el recordatorio (o el barbero la confirmó a mano) | Sí |
| `completed` | El cliente vino. La cita que termina sin marca pasa sola a este estado | Sí (es historia) |
| `no_show` | No vino; suma 1 al contador de inasistencias del cliente | Sí (es historia) |
| `cancelled` | Cancelada, con `cancelled_by` (customer o staff) y el motivo | **No** |
| `rejected` | El barbero no aprobó la reserva | **No** |

Solo los estados que ocupan el horario entran en la restricción de exclusión. Una cita cancelada libera la hora.

## Garantía de que no hay dos citas a la misma hora

- `appointments.period` es un `tstzrange` semiabierto `[inicio, fin)`. Una cita de 3:00 a 4:00 no choca con otra de 4:00 a 5:00.
- **Restricción de exclusión** (con la extensión `btree_gist`): `EXCLUDE USING gist (barber_id WITH =, period WITH &&) WHERE (status NOT IN ('cancelled','rejected'))`.
- Si dos personas reservan la misma hora al mismo tiempo, Postgres acepta una y rechaza la otra con el error `23P01`, que `book_appointment` traduce a "Esa hora se acaba de ocupar, elige otra".
- Las restricciones se aplican aunque haya RLS y aunque el personal cree la cita a mano. No hay forma de saltarlas desde la aplicación.
- Los bloqueos del barbero (`time_off`) viven en otra tabla y no pueden entrar en la misma restricción. `book_appointment` y un trigger los verifican, y el trigger bloquea la fila del barbero (`SELECT ... FOR UPDATE`) para que dos operaciones al mismo tiempo no se crucen. Ver [09](09-modelo-datos.md).

## Cancelación y reprogramación

- **El cliente** puede cancelar o reprogramar desde "Mis citas" o desde el enlace del WhatsApp **hasta 2 horas antes**. Después, el botón se reemplaza por "Escríbele al barbero" (enlace a su WhatsApp).
- **Reprogramar** es una sola operación (`reschedule_appointment`): crea la cita nueva y cancela la anterior en la misma transacción, enlazadas por `rescheduled_from`. Si la hora nueva ya no está libre, no se toca la anterior.
- **El personal** puede cancelar o mover cualquier cita en cualquier momento, con un motivo.
- Cada cancelación avisa a la otra parte: al barbero por push y al cliente por WhatsApp (plantilla de utilidad `cita_cancelada`; decisión abierta en [10](10-riesgos-decisiones-abiertas.md)).

## Inasistencias

1. **Por omisión, el cliente vino** (20/11/2026, pedido de Juan; antes el barbero marcaba "Vino" o "No vino" y lo que no marcaba quedaba "por cerrar"). Cuando una cita `booked` o `confirmed` termina, `pg_cron` la pasa a `completed` en menos de un minuto y `commissions` registra su cobro con el precio de la reserva (ver [09](09-modelo-datos.md#commissions)). El barbero solo marca **No vino**: desde la hora de inicio, mientras la cita sigue abierta o después de que se cerró. Sobre una cita ya cerrada, el barbero puede hacerlo el mismo día de la cita y el administrador, siempre; su cobro se anula con el motivo "No vino". No hay "Vino" en la interfaz.
2. Cada `no_show` suma 1 a `customer_booking_status.no_show_count` (tabla del módulo `booking`).
3. Al llegar a 2 (`booking_settings.no_show_threshold`), `customer_booking_status.requires_approval` pasa a `true`. Desde ese momento sus reservas en línea entran como `pending_approval` y el barbero las aprueba o rechaza. El cliente ve el aviso "Tu reserva queda pendiente de que el barbero la apruebe".
4. El administrador puede reiniciar el contador o quitar la marca a mano.
5. Si en el futuro se habilitan anticipos (fase 3), esta regla es el punto donde se exigirían.

## Citas creadas por el personal

- Desde la agenda, en una hora libre: "Nueva cita", con el cliente (se busca entre sus clientes o se crea con nombre y celular), el servicio y la hora.
- El cliente puede no tener cuenta. Igual recibe los recordatorios por WhatsApp si dio su número y aceptó.
- Para quien llega sin cita y hay espacio, el barbero crea la cita en ese momento. Para guardar espacio a esos clientes, bloquea huecos con `time_off`.
- Las citas del personal quedan con `source = 'staff'` y respetan la misma restricción de exclusión. Las reglas de anticipación no les aplican.

## Horario del barbero

- **Horario semanal:** uno o varios rangos por día de la semana (por ejemplo, de 9:00 a 12:00 y de 14:00 a 19:00 para dejar el almuerzo). **[PENDIENTE]** el horario real.
- **Bloqueos (`time_off`):** rangos de fecha y hora en que no atiende, como vacaciones, una diligencia o un festivo. Los festivos de Colombia se pueden precargar como bloqueos sugeridos para que el dueño los acepte o no.
- Las horas libres se calculan así: horario del día, menos bloqueos, menos citas que ocupan, menos lo que esté antes de la anticipación mínima, alineadas al intervalo de inicio y con espacio para la duración del servicio.
