# Fases de construcción

Plan para construir el MVP (la "fase 1" de producto de [docs/05-alcance.md](../docs/05-alcance.md)) en pasos que se pueden terminar, probar y revisar uno por uno. Creado el 19/11/2026.

Para no confundirlas con las fases de producto, las de construcción se llaman **F0 a F9**. Las fases de producto 2 y 3 están resumidas en [F10](F10-despues-del-mvp.md).

## Orden

| Fase | Qué entrega | Depende de | Estado |
|---|---|---|---|
| [F0](F0-base.md) | Monorepo, CI, Supabase local y despliegue vacío en Vercel | | En curso: solo falta el trámite con Meta (pista paralela) |
| [F1](F1-sistema-diseno.md) | `packages/ui`: tokens, tipografía, logo y componentes base | F0 | Terminada en código el 19/11/2026. Falta el visto bueno del dueño (paleta y Geist), el logo en SVG y la prueba con VoiceOver y TalkBack en celulares reales |
| [F2](F2-datos-agenda.md) | Tablas, restricción de exclusión, RLS y funciones de la agenda y de los cobros, con pgTAP | F0 | Terminada en código el 19/11/2026. Falta el horario real del dueño (la semilla usa uno de ejemplo) |
| [F3](F3-cuentas.md) | Registro, ingreso, perfil y autorización de datos | F1, F2 | Terminada en código el 19/11/2026. Google activo en producción. Primer administrador (el dueño, administrador y barbero) creado en producción el 19/11/2026. Falta el SMTP y las plantillas de correo, el texto de la política (dueño) y la prueba de Google en un iPhone real |
| [F4](F4-reserva-cliente.md) | Página pública y flujo de reserva | F1, F2, F3 | Terminada en código el 19/11/2026. Servicios y precios cargados en producción el 19/11/2026 (los de Beunik). Dirección y mapa (Girardot) el 19/11/2026. Faltan frase, foto y portafolio (dueño) y probar Google desde "Confirmar" con una cuenta real |
| [F5](F5-mis-citas.md) | Mis citas: cancelar, cambiar hora, volver a reservar y .ics | F4 | Terminada en código el 19/11/2026. Falta aplicar su migración a producción, importar el .ics en iOS y Google Calendar desde un celular real y probar la hoja de cancelar con el gesto atrás de Android |
| [F6](F6-panel-barbero.md) | Panel: agenda, citas manuales, asistencia con cobro, liquidación, horario, clientes y administración | F2, F3 | Terminada en código el 19/11/2026. Faltan los datos reales del dueño (horario, foto, portafolio, WhatsApp), probar "Hoy" una jornada junto a Beunik, comparar una liquidación con Beunik y la prueba en celulares reales |
| [F7](F7-whatsapp.md) | Recordatorios por WhatsApp: plantillas, despacho, webhook y botones | F2, F5, trámite de Meta | Sin empezar |
| [F8](F8-pwa-push.md) | PWA instalable, sin conexión y push al barbero | F4, F6 | Sin empezar |
| [F9](F9-lanzamiento.md) | Datos reales, dominio, pruebas en celulares y salida de Beunik | F0 a F8 | Sin empezar |
| [F10](F10-despues-del-mvp.md) | Fases de producto 2 y 3 | F9 | Sin empezar |

F1 y F2 pueden avanzar en paralelo. F6 puede empezar apenas termine F3, en paralelo con F4 y F5.

Para empezar F1 o F2, lee primero [F0-entrega.md](F0-entrega.md): qué existe, cómo se trabaja y lo que no es evidente en el código. Para F3 en adelante, lee también [F1-entrega.md](F1-entrega.md): cómo se usan los tokens y componentes de `@possos/ui`, y [F2-entrega.md](F2-entrega.md): tablas, funciones, códigos de error y cómo se prueban. Para F4 en adelante, además, [F3-entrega.md](F3-entrega.md): sesión, guardas, el parámetro `next` y el perfil. Para F5 en adelante, [F4-entrega.md](F4-entrega.md): el estado del flujo en la URL, las funciones nuevas, Realtime y cómo se prueban las reservas. Para F7 y F8, [F6-entrega.md](F6-entrega.md): el panel, la agenda en vivo y cómo se prueba. Para F7, además, [F5-entrega.md](F5-entrega.md): `/mis-citas/<id>`, el destino de los botones de WhatsApp.

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
