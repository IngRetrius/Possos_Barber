# Entrega de F0

Estado del proyecto al cerrar la parte técnica de [F0](F0-base.md), el 19/11/2026. Es el punto de partida de F1 y F2. Las reglas siguen en [CLAUDE.md](../CLAUDE.md); este documento cuenta lo que existe y lo que no es evidente al leer el código.

## Qué existe

| Pieza | Dónde | Estado |
|---|---|---|
| Monorepo pnpm 12 + Turborepo | raíz | `pnpm turbo run build lint typecheck test` en limpio |
| Configuración compartida | `packages/config` | tsconfig estricto, ESLint 9, Prettier, reglas de dependency-cruiser y las constantes `TIMEZONE` y `LOCALE` |
| Paquetes de dominio | `packages/{auth,catalog,barbers,customers,booking,commissions,notifications,ui}` | Vacíos: `package.json` con `exports` solo para `"."`, `src/index.ts` y `sql/README.md` con sus tablas |
| Clientes de Supabase | `packages/supabase` | `/client`, `/server` y `/admin`, y `database.types.ts` generado (hoy vacío) |
| App | `apps/web` | Next 16.4.6, Tailwind 4, `lang="es-CO"`, grupos de rutas vacíos |
| Base local | `supabase/` | Sin migraciones; una prueba pgTAP de ejemplo |
| CI | `.github/workflows/ci.yml` | Formato, dependency-cruiser, lint, tipos, Vitest, build y pgTAP. En verde |
| Repo | github.com/IngRetrius/Possos_Barber | **Público** |
| Vercel | proyecto `possos-web`, equipo juan-pereas-projects | Publicado en https://possos-web.vercel.app. Cada push a `main` despliega a producción |
| Supabase en la nube | proyecto de producción | Conectado a GitHub (integración de Supabase) y a Vercel (integración de Vercel) |

## Cómo se trabaja

- Comandos: ver la sección "Desarrollo local" del [README](../README.md).
- Todo se trabaja directamente en `main`, sin ramas ni PR, mientras Juan sea el único desarrollador (decisión del 19/11/2026). Cada push corre CI y despliega a producción en Vercel; por eso se hace push solo con todo en verde en local.
- Si dos chats trabajan en paralelo, cada uno hace commit solo de sus archivos y `git pull --rebase` antes de cada push.
- Al cerrar una fase: marcar sus tareas en su archivo, actualizar la columna "Estado" de [README.md](README.md) y los documentos de `docs/` que cambiaron.

## Lo que no es evidente

### Versiones

- **TypeScript 6.0.3**, no 7: typescript-eslint todavía no admite TypeScript 7.
- **ESLint 9**, no 10: los plugins de `eslint-config-next` todavía no admiten ESLint 10. pnpm avisa que ESLint 9 está obsoleto; el aviso es esperado.
- **pnpm 12 rechaza paquetes publicados hace menos de un día** (`minimumReleaseAge`). Si un `pnpm add` falla por eso, se fija una versión anterior. No se agregan excepciones en `pnpm-workspace.yaml`.

### Next 16

- El middleware ahora se llama **`proxy.ts`** (en `apps/web/proxy.ts`). Es donde F3 refresca la sesión de Supabase.
- `next build` usa Turbopack. Para la PWA (F8) se usa **`@serwist/turbopack`**, no `@serwist/next` (verificado; ver [docs/07](../docs/07-stack.md)).
- Los paquetes exponen TypeScript sin compilar. Un paquete nuevo se agrega a `transpilePackages` en `apps/web/next.config.ts`.

### Modularidad

- Las reglas viven en `packages/config/dependency-cruiser.cjs`. La regla `only-public-api` acepta como entradas públicas solo `src/{index,server,ui,client,events,admin,constants}.ts(x)`. **Si un paquete declara otra entrada en `exports`** (por ejemplo, un CSS de `ui`), hay que agregarla a `PUBLIC_ENTRY` en ese archivo o dependency-cruiser fallará.
- Para importar otro paquete del monorepo, este se declara en `dependencies` con `"workspace:*"`. Si no se declara, el import no resuelve y dependency-cruiser lo marca como `no-unresolvable`.

### Supabase

- **Puertos locales 55320 a 55329**, no los 543xx de siempre: en el equipo de Juan corre otro proyecto de Supabase en los puertos por defecto. API `http://127.0.0.1:55321`, base `postgresql://postgres:postgres@127.0.0.1:55322/postgres`, Studio `http://127.0.0.1:55323`.
- Docker lo da **Colima** (`colima start`), no Docker Desktop.
- Variables con las claves nuevas: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (antes anon key) y `SUPABASE_SECRET_KEY` (antes service role). En local van en `apps/web/.env.local`, que está fuera del repo.
- En Vercel las carga la integración, **solo en Production**. Además agrega `POSTGRES_*`, `SUPABASE_JWT_SECRET` y las claves antiguas, que el código no usa.
- Migraciones: `supabase/migrations/<timestamp>_<módulo>_<nombre>.sql`. **La integración de GitHub de Supabase no las aplica sola** (comprobado el 19/11/2026: después del push de F2, producción no tenía ninguna). Se aplican a mano con `pnpm db:push` (ver [docs/08](../docs/08-estructura-monorepo.md#despliegue-en-vercel)).
- Broadcast desde la base: `realtime.send(payload, event, topic, private => false)`. El envío falla si ese día nadie se ha conectado por WebSocket, y el trigger debe tolerarlo sin abortar la reserva ([docs/07](../docs/07-stack.md#decisiones-y-alternativas-descartadas)).
- `pnpm db:types` regenera `packages/supabase/src/database.types.ts` desde la base local.

### Vercel

- *Root Directory* `apps/web`, build `turbo run build --filter=web...`, Node 24.x.
- `ENABLE_EXPERIMENTAL_COREPACK=1` hace que Vercel use el pnpm 12.6.0 de `packageManager`. Si se quita, el build usa otro pnpm.
- Las URL que no son de producción piden inicio de sesión de Vercel (protección por omisión del equipo).
- Las funciones están en `iad1` (Washington). **Pendiente:** el proyecto de Supabase está en `us-west-2` (Oregón), así que conviene mover las funciones a `pdx1` (Portland). Es un cambio en la configuración del proyecto de Vercel; lo decide Juan.

## Pendiente fuera del código

- **Meta (pista paralela):** número decidido el 19/11/2026 (opción A, número nuevo). Falta que el dueño saque la SIM y cree el portafolio de negocio con moneda COP ([docs/03](../docs/03-recordatorios-whatsapp.md#requisitos-de-meta-antes-de-enviar-el-primer-mensaje)).
- **Datos del negocio** que siguen **[PENDIENTE]**: precio del corte, horario de atención y dirección ([docs/10](../docs/10-riesgos-decisiones-abiertas.md)).
