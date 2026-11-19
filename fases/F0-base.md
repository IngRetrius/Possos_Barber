# F0. Base del monorepo

## Objetivo

Que exista el esqueleto del proyecto, que CI vigile las reglas desde el primer commit y que un despliegue vacío llegue a Vercel. Al terminar, agregar un paquete o una migración es rutina.

**Depende de:** nada. **Toca:** la raíz, `apps/web`, `packages/config`, `packages/supabase` y `supabase/`.

## Tareas

### Monorepo

- [x] `pnpm-workspace.yaml` con `apps/*` y `packages/*`. Fijar versiones con `pnpm` ([docs/07](../docs/07-stack.md)); confirmar la versión de Next con `npm view next version`.
- [x] `turbo.json` con las tareas `build`, `dev`, `lint`, `typecheck`, `test` y `test:e2e`.
- [x] `packages/config`: `tsconfig` base en modo `strict` con `moduleResolution: "bundler"`, configuración de ESLint y Prettier, y reglas de dependency-cruiser.
- [x] `.dependency-cruiser.cjs` con el grafo permitido de [docs/08](../docs/08-estructura-monorepo.md#reglas-de-modularidad): sin ciclos, sin rutas internas, `booking` no conoce a `notifications`.
- [x] Los paquetes de dominio vacíos (`auth`, `catalog`, `barbers`, `customers`, `booking`, `commissions`, `notifications`, `ui`) con su `package.json`, el campo `exports` y un `index.ts`. Cada uno con un `sql/README.md` que diga qué tablas le pertenecen.

### App

- [x] `apps/web` con Next.js (App Router), TypeScript y Tailwind v4.
- [x] Grupos de rutas vacíos: `(public)`, `(auth)`, `(customer)`, `(staff)/panel`.
- [x] `lang="es-CO"` en el `<html>` y la zona horaria `America/Bogota` como constante compartida.

### Supabase

- [x] `supabase init` y `supabase start` en local (Docker).
- [x] `packages/supabase`: fábrica de clientes de navegador, servidor y admin con `@supabase/ssr`, y el script que genera `database.types.ts`.
- [x] Proyecto de Supabase en la nube para producción, conectado a GitHub con la integración de Supabase (19/11/2026). **[PENDIENTE]** si se crea también uno de pruebas.

### CI y despliegue

- [x] GitHub Actions: instalar, `lint`, `typecheck`, dependency-cruiser, Vitest y `supabase test db` contra una base local. Workflow en `.github/workflows/ci.yml`; primera corrida en verde el 19/11/2026.
- [x] Proyecto en Vercel con *Root Directory* `apps/web` y el build `turbo run build --filter=web...` (19/11/2026): `possos-web` en el equipo juan-pereas-projects, Node 24.x, conectado a GitHub y publicado en https://possos-web.vercel.app. `ENABLE_EXPERIMENTAL_COREPACK=1` hace que Vercel use el pnpm 12.6.0 de `packageManager`.
- [x] Variables de entorno de Supabase cargadas en Vercel. Ningún secreto en el repo (regla 6). `.env.example` solo con los nombres. Las carga la integración de Vercel en el panel de Supabase (19/11/2026), solo en Production; también agrega `POSTGRES_*`, `SUPABASE_JWT_SECRET` y las claves antiguas, que el código no usa.

### Verificaciones de [docs/10](../docs/10-riesgos-decisiones-abiertas.md#verificaciones-pendientes-antes-de-escribir-código)

- [x] Serwist con Turbopack en la versión de Next que se instaló.
- [x] El mecanismo de Broadcast desde la base de datos en la documentación vigente de Supabase.

### Pista paralela

- [ ] Empezar el trámite con Meta: portafolio de negocio con moneda COP y la decisión del número (A o B) con el dueño. Decisión tomada el 19/11/2026: A, con un número nuevo; falta que el dueño saque la SIM y crear el portafolio.

## Notas de la implementación (19/11/2026)

- Versiones fijadas: Next 16.4.6, React 19.3.1, TypeScript 6.0.3, Tailwind 4.3.5, ESLint 9.39.5, Turborepo 2.11.12, Vitest 5.1.1, Supabase CLI 3.2.0 y `@supabase/ssr` 0.12.7. TypeScript 7 todavía no es compatible con typescript-eslint, y ESLint 10 todavía no lo es con los plugins de `eslint-config-next`.
- pnpm 12 rechaza paquetes publicados hace menos de un día (`minimumReleaseAge`). No se agregan excepciones: se fija una versión anterior.
- La CLI de Supabase usa los puertos 55320 a 55329 (no los 543xx por omisión) para no chocar con otros proyectos locales. API en `http://127.0.0.1:55321`, Studio en `http://127.0.0.1:55323`.
- Las variables de Supabase usan las claves nuevas: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (antes anon key) y `SUPABASE_SECRET_KEY` (antes service role).
- La constante de zona horaria y el idioma viven en `@possos/config/constants` (`TIMEZONE`, `LOCALE`), que cualquier paquete puede importar.
- dependency-cruiser se probó con tres casos que fallan (import por nombre a `src/internal/`, ruta relativa a `src/internal/` de otro paquete y `booking` → `notifications`) y uno que pasa (`notifications` → API pública de `booking`).

## Criterios de aceptación

- `pnpm install && pnpm turbo run build lint typecheck` pasa en limpio.
- Un import a `@possos/booking/src/internal/x` desde otro paquete hace fallar a dependency-cruiser en CI. Se prueba con un commit de ejemplo y se revierte.
- La URL de Vercel muestra una página vacía con el `lang` correcto.
- `supabase start` levanta la base local y los tipos se generan sin errores.

## Pruebas

- Un Vitest de ejemplo en un paquete, para comprobar que el pipeline corre.
- Un pgTAP de ejemplo (`select plan(1); select pass('base');`).

## Necesita del dueño

- Decisión del número de WhatsApp (A o B) para empezar con Meta.
