# Sitio web de Possos Barber

Una PWA de agendamiento para Possos Barber, una barbería de Ibagué (Colombia), @possosbarber en Instagram. Por ahora hay un solo barbero, que también es el dueño y el administrador. El sitio reemplaza a Beunik. El motivo principal es abaratar los recordatorios por WhatsApp, porque se pierden cortes cuando al cliente se le olvida la cita.

- Estado: investigación terminada el 18/11/2026 y diseño de interfaz el 19/11/2026. F0 (esqueleto del monorepo) en curso desde el 19/11/2026; el desarrollo local está en `README.md`. Los documentos están en `docs/`; el índice, en `README.md`. El plan de construcción está en `fases/` (F0 a F10); al cerrar una fase se actualiza su estado en `fases/README.md`.
- Interfaz: `docs/11-interfaz.md` manda sobre colores, tipografía y pantallas. Monocromo con el amarillo `#F2F824` como único acento.
- Proyecto hermano: el editor de videos del barbero, en `../possos-barber`. No comparten código.

## Reglas

1. **Idioma.** Documentación y textos de la interfaz en español de Colombia, con tuteo y sin emojis. Identificadores de código, nombres de tablas y columnas en inglés.
2. **Modularidad.** Cada dominio (auth, catalog, barbers, customers, booking, commissions, notifications, ui) es un paquete en `packages/` con una API pública declarada en el campo `exports` de su `package.json`. Ningún paquete importa archivos internos de otro. `apps/web` es la raíz de composición: el único lugar donde se juntan los módulos. Las reglas completas están en `docs/08-estructura-monorepo.md`.
3. **Una cita por barbero a la vez.** La base de datos lo garantiza con una restricción de exclusión sobre `appointments`; la interfaz solo es una ayuda. Ningún cambio puede quitar o debilitar esa restricción, y se prueba con pgTAP.
4. **RLS en todas las tablas.** Ninguna tabla de `public` queda sin RLS. El cliente lee la disponibilidad a través de funciones que no exponen datos de otros clientes. Un barbero solo ve a sus propios clientes; el administrador ve todo.
5. **WhatsApp.** Se usa la Cloud API de Meta directamente, sin intermediarios que cobren por mensaje. Las plantillas de recordatorio son de categoría utilidad y no llevan contenido promocional, porque Meta las pasaría a marketing, que cuesta unas 15 veces más. Ver `docs/03-recordatorios-whatsapp.md`.
6. **Secretos.** Los tokens de Meta, las claves VAPID y la clave secreta de Supabase (`SUPABASE_SECRET_KEY`, antes service role) viven solo en las variables de entorno de Vercel y en los secrets de Supabase. Nunca van en el repo ni en el chat.
7. **Datos personales.** Se cumple la Ley 1581 de 2012 (habeas data): hay autorización explícita al registrarse y una política de tratamiento visible. El teléfono de un cliente nunca se muestra a otro cliente.
8. **No inventar datos del negocio.** Precios, horarios, servicios y textos de la barbería salen del dueño. Lo que todavía no confirmó queda marcado como **[PENDIENTE]**.
9. **Mobile first.** Se diseña y se prueba primero en un viewport de 390 px. Escritorio es una adaptación.

## Decisiones del dueño (18/11/2026)

Detalle en `docs/00-contexto.md`. No se vuelven a discutir sin que él lo pida: un solo barbero por ahora; el personal puede crear citas para clientes sin cuenta; el corte normal dura 1 hora; se puede cancelar o reprogramar hasta 2 horas antes; después de 2 inasistencias, la reserva necesita aprobación; "cualquiera disponible" asigna al barbero con menos citas ese día; registro con Google o con correo y contraseña; el dueño es administrador y barbero; sin anticipos ni pagos en línea; WhatsApp Business ya existe y se acepta pagar por mensaje si sale más barato que la competencia; repo propio con entregables en `.md`.

19/11/2026: las "facturas" de Beunik solo reparten el valor de cada servicio entre barbero y barbería con un porcentaje que fija el administrador (hoy, 50 % para todos los servicios). Entran en el MVP como cobros y liquidación (módulo `commissions`, ver `docs/09-modelo-datos.md`). En la interfaz no se llaman "factura", porque no son factura electrónica de la DIAN.
