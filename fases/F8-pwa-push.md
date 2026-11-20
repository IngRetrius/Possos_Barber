# F8. PWA y notificaciones push

## Objetivo

Que el sitio se instale como app en Android y en iPhone, que "Mis citas" se vea sin conexión y que el barbero reciba un aviso push por cada reserva, cambio, confirmación o cancelación, sin costo por mensaje.

**Depende de:** F4 y F6. **Toca:** `apps/web` (`manifest.ts`, `sw.ts`) y `packages/notifications` (push).

## Tareas

### Instalación

- [x] `app/manifest.ts`: nombre "Possos Barber", `display: standalone`, `theme_color` y `background_color` `#0B0B0B`, `lang: es-CO`, íconos de F1 (192, 512 y *maskable*).
- [x] Pantalla de inicio de iOS (`apple-touch-icon` y meta de estado: barra negra, no translúcida).
- [x] Invitación a instalar después de reservar (F4) y en "Mis citas", nunca al entrar. En Android usa `beforeinstallprompt`; en iOS muestra la guía "Compartir y luego Agregar a inicio".

### Sin conexión

- [x] Serwist: la cáscara de la app y "Mis citas" en caché; las horas libres siempre de la red.
- [x] Pantalla sin conexión con el texto de [docs/11](../docs/11-interfaz.md#textos-de-la-interfaz). Reservar exige conexión y lo dice.
- [x] Actualización del service worker sin dejar al usuario con una versión vieja (aviso "Hay una versión nueva" y recarga).

### Push al barbero

- [x] Claves VAPID en las variables de entorno (regla 6). En local, en `apps/web/.env.local`; en producción las carga Juan en Vercel.
- [x] Pedir permiso solo desde un botón en "Más" ("Activar avisos"), nunca al abrir.
- [x] Guardar la suscripción en `push_subscriptions`; borrar las que respondan 404 o 410.
- [x] Enviar push desde `packages/notifications` al procesar los eventos de `booking_events`: nueva reserva, cambio, confirmación, cancelación y pendiente de aprobar.
- [x] Tocar el aviso abre el detalle de esa cita en "Hoy" (`/panel?dia=<día>&cita=<id>`).

### Verificaciones

- [ ] El OAuth de Google dentro de la PWA instalada en un iPhone real ([riesgo 6](../docs/10-riesgos-decisiones-abiertas.md)).
- [ ] Push en iOS con la app instalada (desde iOS 16.4) y en Android.

## Criterios de aceptación

- La app se instala en Android y en iPhone, abre a pantalla completa con el ícono del monograma y respeta la zona segura.
- Con el modo avión, "Mis citas" muestra la última versión cargada.
- El barbero recibe el push de una reserva nueva en menos de 1 minuto con la app cerrada.
- Lighthouse marca la app como instalable.

## Cierre (19/11/2026)

Terminada en código. Lo construido y lo que no es evidente está en [F8-entrega.md](F8-entrega.md). En local, con el build de producción:

- Lighthouse 11.7.1 (la última con la categoría PWA; la 12 la quitó): PWA 100 %, `installable-manifest` aprobado. Chrome no reporta errores de instalabilidad (`Page.getInstallabilityErrors`). Lighthouse 12.8.2 en el inicio: rendimiento 94, accesibilidad 100, buenas prácticas 100, SEO 100.
- Con la red cortada, "Mis citas" y la cita próxima salen de la caché con estilos y fuente; `/reservar` muestra la pantalla sin conexión; "Cancelar" muestra el error en la hoja.
- Push de punta a punta contra un servicio de push falso (HTTPS local que descifra con las claves del suscriptor): de la reserva en la base al aviso, menos de 3 segundos; la suscripción que respondió 410 quedó borrada.
- "Hay una versión nueva" y "Actualizar" probados con un cambio real del worker.

## Lista de verificación en celulares reales

Pendiente. Anotar aquí la fecha, el modelo y la versión del sistema de cada prueba.

| Prueba | iPhone | Android |
|---|---|---|
| Instalar desde "Listo" o "Mis citas" (iPhone: Compartir y "Agregar a inicio"; Android: aviso del navegador). Abre a pantalla completa, con el monograma, sin nada debajo de la isla ni de la barra de gestos | | |
| "Activar avisos" en "Más" con la app instalada (iPhone: iOS 16.4 o posterior). "Enviar un aviso de prueba" llega | | |
| Push con la app cerrada: reservar desde otro celular; el aviso llega en menos de 1 minuto. Tocarlo abre la cita en "Hoy" | | |
| Modo avión: "Mis citas" y la cita próxima se ven; "Reservar" muestra la pantalla sin conexión; "Cancelar" dice que necesita conexión | | |
| "Continuar con Google" dentro de la PWA instalada ([riesgo 6](../docs/10-riesgos-decisiones-abiertas.md)) | | |
| "Agregar al calendario" (.ics) desde la PWA instalada (pendiente de F5) | | |
| "Hay una versión nueva" después de un despliegue, y "Actualizar" | | |
| Cerrar sesión y entrar con otra cuenta: los avisos del barbero dejan de llegar a ese celular | | |

## Pruebas

- Playwright: el manifiesto y el service worker se registran.
- Vitest del armado de cada aviso push (texto y URL de destino).
- Prueba manual en un iPhone y un Android reales, con lista de verificación anotada en este archivo.

## Necesita del dueño

- Instalar la PWA en su celular y activar los avisos durante la configuración inicial.
