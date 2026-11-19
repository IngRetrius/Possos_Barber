# F4. Página pública y flujo de reserva

## Objetivo

Que un cliente abra el enlace de Instagram, vea la barbería y reserve su corte en pocos toques. Es el corazón del producto. Sigue las pantallas de [docs/11](../docs/11-interfaz.md#pantallas-del-cliente) y el flujo de [docs/04](../docs/04-agendamiento.md#flujo-del-cliente-mínimo-4-pasos).

**Depende de:** F1, F2 y F3. **Toca:** `packages/booking` (UI), `packages/catalog` (UI), `packages/barbers` (UI) y las rutas `(public)` y `(customer)/reservar`.

## Tareas

### Página pública

- [ ] Inicio: logo, nombre, frase, servicios con duración y precio, barbero con foto y portafolio, ubicación con mapa, horario e Instagram y WhatsApp. Todo dato faltante dice **[PENDIENTE]**.
- [ ] Barra inferior fija con "Reservar".
- [ ] Si el cliente tiene una cita próxima, mostrarla primero.
- [ ] Renderizado en el servidor, metadatos y datos estructurados `BarberShop`.
- [ ] Imágenes del portafolio optimizadas con `next/image`.

### Flujo de reserva

- [ ] Estado del flujo en la URL (`?servicio=…&barbero=…&fecha=…&hora=…`), para que el botón atrás funcione y el regreso del registro no pierda nada.
- [ ] Paso Servicio: solo si hay más de un servicio activo; tocar una fila avanza.
- [ ] Paso Barbero: solo si hay más de un barbero activo; incluye "Cualquiera disponible".
- [ ] Paso Horario: `DateStrip` y `SlotGrid`, hoy elegido por omisión o el primer día con horas, esqueleto al cambiar de día y "Ver la próxima hora libre".
- [ ] Suscripción a `slots:<barber_id>:<fecha>` por Broadcast: al llegar el aviso se vuelven a pedir las horas; si la elegida desapareció, se avisa en la barra inferior.
- [ ] Paso Confirmar: resumen, política de 2 h, aviso de aprobación si aplica, y los botones de cuenta si no hay sesión.
- [ ] "Reservar" llama a `book()` por una Server Action. `SLOT_TAKEN` devuelve al paso de horario con el aviso.
- [ ] Pantalla "Listo": resumen, aviso del WhatsApp (si aceptó), "Agregar al calendario" e invitación a instalar.
- [ ] Indicador "Paso n de m" calculado con los pasos que de verdad se muestran.

### Escritorio

- [ ] A partir de `md:`, la tira de días se vuelve un mes y las horas quedan al lado. Es una adaptación; no cambia el flujo.

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

## Necesita del dueño

- Servicios, precios y duraciones ([decisión 2](../docs/10-riesgos-decisiones-abiertas.md)).
- Dirección ([decisión 4](../docs/10-riesgos-decisiones-abiertas.md)), frase de presentación, foto y portafolio.
