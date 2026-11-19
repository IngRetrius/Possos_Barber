# 00. Contexto y decisiones del dueño

Actualizado el 18/11/2026.

## El negocio

- **Possos Barber**, barbería en Ibagué, Tolima (Colombia). Instagram: @possosbarber.
- **Una sede y un barbero.** El dueño corta y además administra. El sistema se diseña para varios barberos (el flujo tiene el paso "elegir barbero"), pero mientras haya uno solo activo ese paso se salta.
- **Hoy usa Beunik PRO.** Paga un plan de unos 50.000 COP al mes. Los recordatorios automáticos por WhatsApp se le acaban y Beunik le cobra **150.000 COP por un paquete de 3.000 mensajes**, es decir, **50 COP por mensaje**.
- **El problema que se quiere resolver:** los clientes olvidan sus citas y el barbero pierde cortes. Los recordatorios por WhatsApp son la herramienta principal, y su costo es lo que hace caro a Beunik.

## Objetivo del proyecto

1. Que se pierdan menos cortes por olvido, con recordatorios por WhatsApp que el cliente pueda confirmar o cambiar con un toque.
2. Que el costo por mensaje sea mucho menor que el de Beunik. Con la Cloud API de Meta directa son unos 3 COP por recordatorio; el cálculo está en [03-recordatorios-whatsapp.md](03-recordatorios-whatsapp.md).
3. Tener un sitio propio con la marca de la barbería, instalable como app en el celular.

## Respuestas del dueño (18/11/2026)

| Tema | Decisión |
|---|---|
| Sedes y barberos | Una sede, un barbero (el dueño) |
| Citas para clientes sin cuenta | **Sí.** El barbero o el administrador pueden crear citas a nombre de clientes que escriben por WhatsApp o llegan en persona |
| Duración | El corte normal dura **1 hora**. Por ahora los turnos también van de hora en hora |
| Cancelación y reprogramación | Se puede cancelar o reprogramar hasta **2 horas antes**. Después de **2 inasistencias**, el cliente necesita aprobación del personal para reservar en línea |
| "Cualquiera disponible" | Se asigna al barbero con **menos citas ese día**; si hay empate, al que hace más tiempo no recibe una asignación |
| Registro | **Google** o **correo y contraseña** |
| Roles | El dueño corta y es el administrador. **Cada barbero solo ve a sus propios clientes** |
| Anticipos y pagos en línea | **No, por ahora.** La apuesta es que los recordatorios reduzcan las inasistencias |
| WhatsApp | Ya tiene **WhatsApp Business**. Acepta pagar por mensaje si sale **más barato que la competencia** |
| Repositorio | **Repo nuevo** (`possos-web`), separado del editor de videos |
| Entregables | Archivos `.md` en `docs/`, organizados para que los lean desarrolladores y agentes en el futuro |
| Facturación (19/11/2026) | Las "facturas" de Beunik solo calculan sobre los servicios: el administrador fija un porcentaje y la app dice cuánto va para el barbero y cuánto se queda la barbería. Hoy usa **50 % para todos los servicios**. Entra en el MVP como cobros y liquidación ([09](09-modelo-datos.md#commissions)) |

## Lo que no respondió (se usa el valor propuesto)

| Tema | Valor que se usa | Dónde se retoma |
|---|---|---|
| Precio y duración de cada servicio | Se cargan por servicio, con la opción de cambiarlos para un barbero. Solo se conoce "corte normal, 60 min"; el resto queda **[PENDIENTE]** | [10](10-riesgos-decisiones-abiertas.md) |
| Clientes y citas en Beunik | No hay migración en el MVP. Hay que averiguar si Beunik permite exportar la lista de clientes | [10](10-riesgos-decisiones-abiertas.md) |
| Anticipación de las reservas | Desde 1 hora hasta 30 días antes | [04](04-agendamiento.md) |
| Identidad visual | Actualizado el 19/11/2026: monocromo tomado del logo (gris `#BCBCBC` sobre negro) con el amarillo `#F2F824` de los videos como único acento y el verde `#00F818` solo para "Confirmada". Modo oscuro. Tipografía Geist propuesta | [11](11-interfaz.md) |
| Alcance del sitio | Página pública (servicios, barbero, ubicación, horario, Instagram) más la agenda. Sin tienda | [05](05-alcance.md) |
| Fidelización | Tarjeta de sellos en la fase 2 | [05](05-alcance.md) |
