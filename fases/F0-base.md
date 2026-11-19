# F0. Base del monorepo

## Objetivo

Que exista el esqueleto del proyecto, que CI vigile las reglas desde el primer commit y que un despliegue vacío llegue a Vercel. Al terminar, agregar un paquete o una migración es rutina.

**Depende de:** nada. **Toca:** la raíz, `apps/web`, `packages/config`, `packages/supabase` y `supabase/`.

## Tareas

### Monorepo

- [ ] `pnpm-workspace.yaml` con `apps/*` y `packages/*`. Fijar versiones con `pnpm` ([docs/07](../docs/07-stack.md)); confirmar la versión de Next con `npm view next version`.
- [ ] `turbo.json` con las tareas `build`, `dev`, `lint`, `typecheck`, `test` y `test:e2e`.
- [ ] `packages/config`: `tsconfig` base en modo `strict` con `moduleResolution: "bundler"`, configuración de ESLint y Prettier, y reglas de dependency-cruiser.
- [ ] `.dependency-cruiser.cjs` con el grafo permitido de [docs/08](../docs/08-estructura-monorepo.md#reglas-de-modularidad): sin ciclos, sin rutas internas, `booking` no conoce a `notifications`.
- [ ] Los paquetes de dominio vacíos (`auth`, `catalog`, `barbers`, `customers`, `booking`, `commissions`, `notifications`, `ui`) con su `package.json`, el campo `exports` y un `index.ts`. Cada uno con un `sql/README.md` que diga qué tablas le pertenecen.

### App

- [ ] `apps/web` con Next.js (App Router), TypeScript y Tailwind v4.
- [ ] Grupos de rutas vacíos: `(public)`, `(auth)`, `(customer)`, `(staff)/panel`.
- [ ] `lang="es-CO"` en el `<html>` y la zona horaria `America/Bogota` como constante compartida.

### Supabase

- [ ] `supabase init` y `supabase start` en local (Docker).
- [ ] `packages/supabase`: fábrica de clientes de navegador, servidor y admin con `@supabase/ssr`, y el script que genera `database.types.ts`.
- [ ] Proyecto de Supabase en la nube para producción. **[PENDIENTE]** si se crea también uno de pruebas.

### CI y despliegue

- [ ] GitHub Actions: instalar, `lint`, `typecheck`, dependency-cruiser, Vitest y `supabase test db` contra una base local.
- [ ] Proyecto en Vercel con *Root Directory* `apps/web` y el build `turbo run build --filter=web...`.
- [ ] Variables de entorno de Supabase cargadas en Vercel. Ningún secreto en el repo (regla 6). `.env.example` solo con los nombres.

### Verificaciones de [docs/10](../docs/10-riesgos-decisiones-abiertas.md#verificaciones-pendientes-antes-de-escribir-código)

- [ ] Serwist con Turbopack en la versión de Next que se instaló.
- [ ] El mecanismo de Broadcast desde la base de datos en la documentación vigente de Supabase.

### Pista paralela

- [ ] Empezar el trámite con Meta: portafolio de negocio con moneda COP y la decisión del número (A o B) con el dueño.

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
