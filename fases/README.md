# Fases de construcción

Plan para construir el MVP (la "fase 1" de producto de [docs/05-alcance.md](../docs/05-alcance.md)) en pasos que se pueden terminar, probar y revisar uno por uno. Creado el 19/11/2026.

Para no confundirlas con las fases de producto, las de construcción se llaman **F0 a F9**. Las fases de producto 2 y 3 están resumidas en [F10](F10-despues-del-mvp.md).

## Orden

| Fase | Qué entrega | Depende de | Estado |
|---|---|---|---|
| [F0](F0-base.md) | Monorepo, CI, Supabase local y despliegue vacío en Vercel | | En curso: falta Vercel y Supabase en la nube |
| [F1](F1-sistema-diseno.md) | `packages/ui`: tokens, tipografía, logo y componentes base | F0 | Sin empezar |
| [F2](F2-datos-agenda.md) | Tablas, restricción de exclusión, RLS y funciones de la agenda y de los cobros, con pgTAP | F0 | Sin empezar |
| [F3](F3-cuentas.md) | Registro, ingreso, perfil y autorización de datos | F1, F2 | Sin empezar |
| [F4](F4-reserva-cliente.md) | Página pública y flujo de reserva | F1, F2, F3 | Sin empezar |
| [F5](F5-mis-citas.md) | Mis citas: cancelar, cambiar hora, volver a reservar y .ics | F4 | Sin empezar |
| [F6](F6-panel-barbero.md) | Panel: agenda, citas manuales, asistencia con cobro, liquidación, horario, clientes y administración | F2, F3 | Sin empezar |
| [F7](F7-whatsapp.md) | Recordatorios por WhatsApp: plantillas, despacho, webhook y botones | F2, F5, trámite de Meta | Sin empezar |
| [F8](F8-pwa-push.md) | PWA instalable, sin conexión y push al barbero | F4, F6 | Sin empezar |
| [F9](F9-lanzamiento.md) | Datos reales, dominio, pruebas en celulares y salida de Beunik | F0 a F8 | Sin empezar |
| [F10](F10-despues-del-mvp.md) | Fases de producto 2 y 3 | F9 | Sin empezar |

F1 y F2 pueden avanzar en paralelo. F6 puede empezar apenas termine F3, en paralelo con F4 y F5.

## Pista paralela: trámite con Meta

Empieza en F0 y no espera al código, porque es lo que más puede tardar ([riesgo 2](../docs/10-riesgos-decisiones-abiertas.md)). Los pasos están en [docs/03](../docs/03-recordatorios-whatsapp.md#requisitos-de-meta-antes-de-enviar-el-primer-mensaje): portafolio de negocio con moneda COP, número (decisión abierta 1), nombre visible, plantillas y verificación. F7 no puede cerrar sin esto.

## Cómo se trabaja cada fase

Cada archivo tiene: objetivo, paquetes que toca, tareas, criterios de aceptación, pruebas y lo que necesita del dueño. Una fase está **terminada** cuando:

1. Todos sus criterios de aceptación se cumplen en un viewport de 390 px.
2. Pasan en CI el lint, los tipos, dependency-cruiser, Vitest, pgTAP y los Playwright de esa fase.
3. Ningún texto de la interfaz tiene emojis ni inventa datos del negocio: lo que falta dice **[PENDIENTE]**.
4. Las tablas nuevas tienen RLS y sus pruebas.
5. Los documentos de `docs/` que cambiaron quedan al día, y la columna "Estado" de esta tabla también.

Las reglas de [CLAUDE.md](../CLAUDE.md) aplican en todas las fases.
