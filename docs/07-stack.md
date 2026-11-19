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
| PWA | **Serwist** (`@serwist/turbopack`) y `app/manifest.ts` de Next | Sucesor mantenido de next-pwa y compatible con App Router. Next 16 compila con Turbopack, que necesita `@serwist/turbopack` en lugar de `@serwist/next`. Verificado el 19/11/2026 con Next 16.4.6 y Serwist 9.5.15: `withSerwist` en `next.config`, una ruta `app/serwist/[path]/route.ts` que compila `app/sw.ts` con esbuild y sirve `/serwist/sw.js`, y `SerwistProvider` en el layout |
| Push | Web Push con claves VAPID (librería `web-push` en Node) | Sin costo. En iOS solo funciona con la app instalada (desde iOS 16.4) |
| WhatsApp | **Cloud API de Meta** por HTTP (`fetch`), sin SDK ni intermediarios | Es lo que abarata los mensajes ([03](03-recordatorios-whatsapp.md)) |
| Tareas programadas | **Vercel Cron** cada 5 minutos, que llama a una ruta de `apps/web` | Despacha los recordatorios que ya tocan. Todo queda en Node y TypeScript dentro del monorepo |
| Pruebas | **Vitest** (unidad), **pgTAP** con `supabase test db` (SQL y RLS) y **Playwright** con viewport de celular (de punta a punta) | La prueba más importante, que no haya dos citas a la vez, se hace en pgTAP contra la base real |
| Límites entre módulos | Campo `exports` en cada `package.json` más **dependency-cruiser** en CI | Ver [08](08-estructura-monorepo.md) |
| Lint y formato | ESLint y Prettier | Estándar |
| Base de datos local | Supabase CLI (Docker): migraciones, semillas y generación de tipos | La misma base en local, en pruebas y en producción |

## Decisiones y alternativas descartadas

**Next.js frente a Vite con una SPA.** Una SPA no renderiza en el servidor la página pública, y Next da rutas de API, cron e imágenes optimizadas en Vercel sin piezas extra.

**Turborepo frente a Nx.** Nx sobra para un monorepo de esta escala. Turborepo se configura con un `turbo.json` pequeño.

**Ruta de Next frente a Supabase Edge Functions para el webhook y el despacho.** Los dos sirven. Se elige Next (Node en Vercel) porque:
- el código del módulo de notificaciones se importa por su API pública como cualquier otro paquete, sin un import map de Deno;
- `web-push` funciona en Node sin adaptaciones;
- hay un solo lugar donde desplegar y ver logs.

Las Edge Functions quedan disponibles si algo necesita correr junto a la base de datos.

**Realtime: Broadcast en vez de Postgres Changes para las horas libres.** Con RLS, un cliente no puede ver los cambios en las citas de otros, así que Postgres Changes no le avisa cuando alguien toma una hora. Un trigger publica en un canal de Broadcast (`slots:<barber_id>:<fecha>`) solo el aviso "cambió la disponibilidad", sin datos personales, y la pantalla vuelve a pedir `get_available_slots`. Verificado el 19/11/2026 en la documentación de Supabase: el trigger llama a `realtime.send(payload, event, topic, private)`. Como la página de reservas la ven también personas sin sesión, el aviso va con `private => false` (canal público), lo que es aceptable porque no lleva datos personales; el cliente se suscribe a un canal no privado con el mismo nombre. Un canal privado (`private => true`, el valor por omisión) exigiría sesión y una política RLS sobre `realtime.messages`. Detalle a tener en cuenta: si nadie se ha conectado por WebSocket ese día, la partición diaria de `realtime.messages` no existe y el envío falla con `WarnSendingBroadcastMessage`; el trigger debe tolerar ese fallo sin abortar la reserva. El barbero sí usa Postgres Changes sobre su propia agenda, porque RLS se lo permite.

**Autenticación.** Supabase Auth con dos proveedores: Google (OAuth) y correo con contraseña, con confirmación por correo. El celular se pide en el perfil, no como método de inicio de sesión. **Pendiente:** probar el inicio de sesión con Google dentro de la PWA instalada en iOS, porque el ir y volver de OAuth en modo standalone puede sacar al usuario de la app.

## Marca en la interfaz

Decisión del 19/11/2026: **monocromo con un solo acento**. Negro, blancos y grises tomados del logo; el amarillo neón de los videos (`#F2F824`) solo en la acción principal y en lo elegido, y el verde neón (`#00F818`) solo en el estado "Confirmada". Tipografía propuesta: Geist en lugar de Poppins. La tabla completa de tokens, con sus contrastes, está en [11](11-interfaz.md#sistema-visual).

Solo modo oscuro en el MVP. El amarillo y el verde neón no sirven como texto sobre blanco, así que un modo claro necesita otros tonos de acento.
