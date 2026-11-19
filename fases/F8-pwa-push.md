# F8. PWA y notificaciones push

## Objetivo

Que el sitio se instale como app en Android y en iPhone, que "Mis citas" se vea sin conexión y que el barbero reciba un aviso push por cada reserva, cambio, confirmación o cancelación, sin costo por mensaje.

**Depende de:** F4 y F6. **Toca:** `apps/web` (`manifest.ts`, `sw.ts`) y `packages/notifications` (push).

## Tareas

### Instalación

- [ ] `app/manifest.ts`: nombre "Possos Barber", `display: standalone`, `theme_color` y `background_color` `#0B0B0B`, `lang: es-CO`, íconos de F1 (192, 512 y *maskable*).
- [ ] Pantalla de inicio de iOS (`apple-touch-icon` y meta de estado).
- [ ] Invitación a instalar después de reservar (F4) y en "Mis citas", nunca al entrar. En Android usa `beforeinstallprompt`; en iOS muestra la guía "Compartir y luego Agregar a inicio".

### Sin conexión

- [ ] Serwist: la cáscara de la app y "Mis citas" en caché; las horas libres siempre de la red.
- [ ] Pantalla sin conexión con el texto de [docs/11](../docs/11-interfaz.md#textos-de-la-interfaz). Reservar exige conexión y lo dice.
- [ ] Actualización del service worker sin dejar al usuario con una versión vieja (aviso "Hay una versión nueva" y recarga).

### Push al barbero

- [ ] Claves VAPID en las variables de entorno (regla 6).
- [ ] Pedir permiso solo desde un botón en "Más" ("Activar avisos"), nunca al abrir.
- [ ] Guardar la suscripción en `push_subscriptions`; borrar las que respondan 404 o 410.
- [ ] Enviar push desde `packages/notifications` al procesar los eventos de `booking_events`: nueva reserva, cambio, confirmación, cancelación y pendiente de aprobar.
- [ ] Tocar el aviso abre el detalle de esa cita en "Hoy".

### Verificaciones

- [ ] El OAuth de Google dentro de la PWA instalada en un iPhone real ([riesgo 6](../docs/10-riesgos-decisiones-abiertas.md)).
- [ ] Push en iOS con la app instalada (desde iOS 16.4) y en Android.

## Criterios de aceptación

- La app se instala en Android y en iPhone, abre a pantalla completa con el ícono del monograma y respeta la zona segura.
- Con el modo avión, "Mis citas" muestra la última versión cargada.
- El barbero recibe el push de una reserva nueva en menos de 1 minuto con la app cerrada.
- Lighthouse marca la app como instalable.

## Pruebas

- Playwright: el manifiesto y el service worker se registran.
- Vitest del armado de cada aviso push (texto y URL de destino).
- Prueba manual en un iPhone y un Android reales, con lista de verificación anotada en este archivo.

## Necesita del dueño

- Instalar la PWA en su celular y activar los avisos durante la configuración inicial.
