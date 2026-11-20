# 07. Stack recomendado

Las versiones se fijan con `pnpm` al iniciar el código. Este documento dice qué se usa y por qué.

## Resumen

| Capa | Elección | Por qué |
|---|---|---|
| Framework | **Next.js 16** (App Router, React Server Components, Server Actions). La versión más reciente encontrada fue 16.4.x (octubre de 2026); confirmar con `npm view next version` | Es de Vercel y despliega sin configuración. Renderiza en el servidor la página pública, lo que ayuda a aparecer en búsquedas locales, y además sirve el panel y la PWA desde la misma app |
| Lenguaje | TypeScript en modo `strict` | Tipos compartidos entre los módulos y con la base de datos |
| Monorepo | **pnpm workspaces + Turborepo** | Turborepo es de Vercel: caché remota y builds solo de lo que cambió. Es más simple que Nx para un equipo de una persona |
| Backend | **Supabase**: Auth, Postgres con RLS, funciones SQL (RPC), Realtime, Storage y Cron | Lo pide el proyecto. Las reglas críticas (sin dos citas a la vez, permisos) viven en Postgres y no dependen de la interfaz |
| Cliente de Supabase en Next | `@supabase/ssr` | Sesión por cookies en Server Components, Server Actions y el proxy de Next (antes `middleware.ts`; Next 16 lo renombró a `proxy.ts`) |
| Estilos | **Tailwind CSS v4** con los tokens de marca | Mobile first por defecto (clases sin prefijo para el celular, `md:` y `lg:` para adaptar) |
| Componentes | **shadcn/ui** (sobre Radix), copiados en `packages/ui` | Accesibles y sin dependencia de una librería cerrada; se adaptan a la marca |
| Validación | **Zod** | Un mismo esquema valida formularios y Server Actions |
| Fechas | **date-fns v4 con `@date-fns/tz`** | Todo se guarda en UTC (`timestamptz`) y se muestra en America/Bogota |
| PWA | **Serwist** (`@serwist/turbopack`) y `app/manifest.ts` de Next | Sucesor mantenido de next-pwa y compatible con App Router. Next 16 compila con Turbopack, que necesita `@serwist/turbopack` en lugar de `@serwist/next`. Hecho en F8 con Next 16.4.6 y Serwist 9.5.15: `withSerwist` en `next.config`, la ruta `app/serwist/[path]/route.ts` que compila `app/sw.ts` con esbuild y sirve `/serwist/sw.js`. El worker se registra con un componente propio (`app/_components/pwa-runtime.tsx`), no con `SerwistProvider`, que guarda en caché cada página que se visita (datos de clientes del panel) |
| Push | Web Push con claves VAPID (librería `web-push` 3.6.7 en Node) | Sin costo. En iOS solo funciona con la app instalada (desde iOS 16.4). Se usa la 3.6.7 y no la 4.0.0 (noviembre de 2026, ESM y sin tipos): la 3 tiene `@types/web-push` |
| WhatsApp | **Cloud API de Meta** por HTTP (`fetch`), sin SDK ni intermediarios | Es lo que abarata los mensajes ([03](03-recordatorios-whatsapp.md)) |
| Despacho y tareas programadas | **`pg_net` y `pg_cron` de Supabase**, que llaman a la ruta `/api/notifications/dispatch` de `apps/web` (decidido en F8, el 19/11/2026; antes decía Vercel Cron) | Un evento de la agenda llama a la ruta al instante (`pg_net`) y `pg_cron` revisa cada minuto si algo quedó atrás. El código del despacho sigue en Node y TypeScript dentro del monorepo. Ver abajo |
| Pruebas | **Vitest** (unidad), **pgTAP** con `supabase test db` (SQL y RLS) y **Playwright** con viewport de celular (de punta a punta) | La prueba más importante, que no haya dos citas a la vez, se hace en pgTAP contra la base real |
| Límites entre módulos | Campo `exports` en cada `package.json` más **dependency-cruiser** en CI | Ver [08](08-estructura-monorepo.md) |
| Lint y formato | ESLint y Prettier | Estándar |
| Base de datos local | Supabase CLI (Docker): migraciones, semillas y generación de tipos | La misma base en local, en pruebas y en producción |

## Decisiones y alternativas descartadas

**Next.js frente a Vite con una SPA.** Una SPA no renderiza en el servidor la página pública, y Next da rutas de API, cron e imágenes optimizadas en Vercel sin piezas extra.

**Cómo se dispara el despacho (F8, 19/11/2026): `pg_net` y `pg_cron` de Supabase, no Vercel Cron.** Lo que se pedía: el barbero recibe el push de una reserva en menos de 1 minuto con la app cerrada, y F7 manda recordatorios a su hora (desfase menor a 5 minutos), con el mismo despacho.
- *Vercel Cron:* en el plan Hobby solo corre una vez al día (con hora imprecisa); cada minuto exige el plan Pro. Aun cada minuto, el push tardaría hasta 60 s más el proceso, justo en el límite. Y despertaría la función 1.440 veces al día aunque no haya nada que hacer.
- *Webhook de base de datos de Supabase:* es un trigger con `pg_net` creado desde el panel; queda fuera del repo y sin pruebas.
- *Elegido:* un trigger de `notifications` sobre `booking_events` (en una migración, con pgTAP) llama con `pg_net` a `/api/notifications/dispatch` en cuanto termina la transacción (`pg_net` encola dentro de la transacción y envía después del commit; si la reserva se deshace, no sale nada). `pg_cron` revisa cada minuto y llama a la ruta solo si algún consumidor tiene eventos pendientes (con la barbería quieta, cero invocaciones). Los dos existen en el plan gratuito de Supabase y no dependen del plan de Vercel. Medido en local: de la reserva al push, menos de 3 segundos.
- *Regiones:* la base está en `us-west-2` y las funciones en `iad1`. Cada despacho hace unas pocas idas y vueltas entre las dos costas (decenas de milisegundos cada una): no afecta el minuto. Mover las funciones a `pdx1` (pendiente de F0) lo acorta, pero no hace falta.
- *Seguridad:* la ruta exige `Authorization: Bearer <CRON_SECRET>` (el mismo nombre que usa Vercel Cron, por si algún día se usa). La URL y el secreto viven en Supabase Vault y en las variables de Vercel, nunca en el repo.
- *F7* agrega su consumidor (`whatsapp`) a la misma ruta y su revisión de `message_jobs` vencidos a `private.notifications_backstop()`; no necesita Vercel Cron.

**Turborepo frente a Nx.** Nx sobra para un monorepo de esta escala. Turborepo se configura con un `turbo.json` pequeño.

**Ruta de Next frente a Supabase Edge Functions para el webhook y el despacho.** Los dos sirven. Se elige Next (Node en Vercel) porque:
- el código del módulo de notificaciones se importa por su API pública como cualquier otro paquete, sin un import map de Deno;
- `web-push` funciona en Node sin adaptaciones;
- hay un solo lugar donde desplegar y ver logs.

Las Edge Functions quedan disponibles si algo necesita correr junto a la base de datos.

**Realtime: Broadcast en vez de Postgres Changes para las horas libres.** Con RLS, un cliente no puede ver los cambios en las citas de otros, así que Postgres Changes no le avisa cuando alguien toma una hora. Un trigger publica en un canal de Broadcast (`slots:<barber_id>:<fecha>`) solo el aviso "cambió la disponibilidad", sin datos personales, y la pantalla vuelve a pedir `get_available_slots`. Verificado el 19/11/2026 en la documentación de Supabase: el trigger llama a `realtime.send(payload, event, topic, private)`. Como la página de reservas la ven también personas sin sesión, el aviso va con `private => false` (canal público), lo que es aceptable porque no lleva datos personales; el cliente se suscribe a un canal no privado con el mismo nombre. Un canal privado (`private => true`, el valor por omisión) exigiría sesión y una política RLS sobre `realtime.messages`. Detalle a tener en cuenta: si nadie se ha conectado por WebSocket ese día, la partición diaria de `realtime.messages` no existe y el envío falla con `WarnSendingBroadcastMessage`; el trigger debe tolerar ese fallo sin abortar la reserva. El barbero sí usa Postgres Changes sobre su propia agenda, porque RLS se lo permite.

**Autenticación.** Supabase Auth con dos proveedores: Google (OAuth) y correo con contraseña, con confirmación por correo. El celular se pide en el perfil, no como método de inicio de sesión. Hecho en F3 con `@supabase/ssr` (flujo PKCE): Google y los correos con las plantillas de Supabase vuelven a `/auth/callback` con un código que solo se cambia en el mismo navegador; las plantillas propias (`supabase/templates/`) llevan `token_hash` a `/auth/confirmar`, que funciona en cualquier navegador. El plan gratuito de Supabase no deja usar plantillas propias sin SMTP propio. Supabase manda los correos por omisión con un servicio de prueba con límite bajo; antes de abrir el registro al público hace falta un SMTP propio ([10](10-riesgos-decisiones-abiertas.md), riesgo 13). **Pendiente:** probar el inicio de sesión con Google dentro de la PWA instalada en iOS, porque el ir y volver de OAuth en modo standalone puede sacar al usuario de la app.

## Marca en la interfaz

Decisión del 19/11/2026: **monocromo con un solo acento**. Negro, blancos y grises tomados del logo; el amarillo neón de los videos (`#F2F824`) solo en la acción principal y en lo elegido, y el verde neón (`#00F818`) solo en el estado "Confirmada". Tipografía propuesta: Geist en lugar de Poppins. La tabla completa de tokens, con sus contrastes, está en [11](11-interfaz.md#sistema-visual).

Solo modo oscuro en el MVP. El amarillo y el verde neón no sirven como texto sobre blanco, así que un modo claro necesita otros tonos de acento.
