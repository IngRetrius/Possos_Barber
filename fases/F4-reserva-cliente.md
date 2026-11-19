# F4. Página pública y flujo de reserva

**Estado:** terminada en código el 19/11/2026. Lo que existe y lo que no es evidente está en [F4-entrega.md](F4-entrega.md). Faltan los datos del dueño (servicios, precios, dirección, frase, foto y portafolio) y probar "Continuar con Google" desde "Confirmar" con una cuenta real.

## Objetivo

Que un cliente abra el enlace de Instagram, vea la barbería y reserve su corte en pocos toques. Es el corazón del producto. Sigue las pantallas de [docs/11](../docs/11-interfaz.md#pantallas-del-cliente) y el flujo de [docs/04](../docs/04-agendamiento.md#flujo-del-cliente-mínimo-4-pasos).

**Depende de:** F1, F2 y F3. **Toca:** `packages/booking` (UI), `packages/catalog` (UI), `packages/barbers` (UI) y las rutas `(public)` y `(customer)/reservar`.

## Tareas

### Página pública

- [x] Inicio: logo, nombre, frase, servicios con duración y precio, barbero con foto y portafolio, ubicación con mapa, horario e Instagram y WhatsApp. Todo dato faltante dice **[PENDIENTE]**.
- [x] Barra inferior fija con "Reservar".
- [x] Si el cliente tiene una cita próxima, mostrarla primero.
- [x] Renderizado en el servidor, metadatos y datos estructurados `BarberShop`.
- [x] Imágenes del portafolio optimizadas con `next/image`.

### Flujo de reserva

- [x] Estado del flujo en la URL (`?servicio=…&barbero=…&fecha=…&hora=…`), para que el botón atrás funcione y el regreso del registro no pierda nada.
- [x] Paso Servicio: solo si hay más de un servicio activo; tocar una fila avanza.
- [x] Paso Barbero: solo si hay más de un barbero activo; incluye "Cualquiera disponible".
- [x] Paso Horario: `DateStrip` y `SlotGrid`, hoy elegido por omisión o el primer día con horas, esqueleto al cambiar de día y "Ver la próxima hora libre".
- [x] Suscripción a `slots:<barber_id>:<fecha>` por Broadcast: al llegar el aviso se vuelven a pedir las horas; si la elegida desapareció, se avisa en la barra inferior.
- [x] Paso Confirmar: resumen, política de 2 h, aviso de aprobación si aplica, y los botones de cuenta si no hay sesión.
- [x] "Reservar" llama a `book()` por una Server Action. `SLOT_TAKEN` devuelve al paso de horario con el aviso.
- [x] Pantalla "Listo": resumen, aviso del WhatsApp (si aceptó), "Agregar al calendario" e invitación a instalar.
- [x] Indicador "Paso n de m" calculado con los pasos que de verdad se muestran.

### Escritorio

- [x] A partir de `md:`, la tira de días se vuelve un mes y las horas quedan al lado. Es una adaptación; no cambia el flujo.

## Criterios de aceptación

- Con un servicio y un barbero, un cliente con sesión reserva en 4 toques desde el inicio: Reservar, una hora, Continuar y Reservar.
- Dos navegadores que reservan la misma hora: uno queda con la cita y el otro ve "Esa hora se acaba de ocupar, elige otra" sin recargar.
- Un cliente sin sesión elige hora, se registra con Google y vuelve al resumen con la misma hora.
- Un cliente que requiere aprobación ve el aviso antes de reservar y su cita queda `pending_approval`.
- La página pública carga sin JavaScript para leer servicios, horario y ubicación.
- Ninguna respuesta al navegador incluye datos de otros clientes (se revisa en la pestaña de red).

## Pruebas

- Playwright a 390 px: flujo completo con sesión, flujo con registro en medio, hora tomada por otro y día sin horas.
- Playwright: el botón atrás del navegador recorre los pasos en orden.
- Lighthouse en la página pública: rendimiento y accesibilidad por encima de 90 en móvil.

## Cierre (19/11/2026)

- Los seis criterios se prueban con Playwright a 390 px en `apps/web/e2e/reserva.spec.ts`, contra Supabase local con la semilla y Realtime:
  - 4 toques con sesión: Reservar, una hora, Continuar y Reservar.
  - Dos clientes y la misma hora: la hora desaparece sin recargar y la barra dice "Esa hora se acaba de ocupar, elige otra". También cuando la otra persona la toma con el resumen abierto: "Reservar" vuelve al horario con el aviso.
  - Registro en medio: con correo (Google no existe en local). Vuelve a "Confirmar" con el mismo resumen y reserva. Con Google el código es el mismo (`GoogleSignIn` con el mismo `next`); falta probarlo en producción con una cuenta real.
  - Aprobación: `aprobacion@ejemplo.test` ve el aviso y su cita queda `pending_approval`.
  - Sin JavaScript: servicios, horario, ubicación y el botón "Reservar" se leen.
  - Red: ninguna respuesta (HTML, RSC ni JSON) trae el nombre, el celular ni el correo de otro cliente.
- También con Playwright: el botón atrás recorre los pasos y el día sin horas lleva a la próxima hora libre.
- Lighthouse 12 en móvil sobre el build de producción (inicio, 19/11/2026): rendimiento 96, accesibilidad 100, buenas prácticas 96 y SEO 100. Lo único que bajaba era el favicon (404), ya resuelto.
- El paso "Servicio" y el de barbero solo se ven con más de un servicio o barbero. La semilla tiene uno de cada uno, así que esos pasos no tienen prueba de Playwright; su lógica (qué pasos se muestran y "Paso n de m") se prueba con Vitest.

## Necesita del dueño

- Servicios, precios y duraciones ([decisión 2](../docs/10-riesgos-decisiones-abiertas.md)).
- Dirección ([decisión 4](../docs/10-riesgos-decisiones-abiertas.md)), frase de presentación, foto y portafolio.
