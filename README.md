# Possos Barber: sitio web y agendamiento

Sitio web de Possos Barber, una barbería de Ibagué (Colombia): una PWA donde los clientes reservan su corte y una agenda para el barbero. Su objetivo es reemplazar Beunik con recordatorios automáticos por WhatsApp que cuesten mucho menos, para que se pierdan menos citas por olvido.

**Estado:** investigación y diseño terminados (19/11/2026). Construcción en [F0](fases/F0-base.md): el esqueleto del monorepo ya corre en local.

## Documentos

| Archivo | Contenido |
|---|---|
| [docs/00-contexto.md](docs/00-contexto.md) | El negocio, el problema y las decisiones del dueño |
| [docs/01-beunik.md](docs/01-beunik.md) | Análisis de Beunik y Beunik PRO: qué adoptar, adaptar y descartar |
| [docs/02-comparativa-plataformas.md](docs/02-comparativa-plataformas.md) | AgendaPro, WeiBook, Booksy, Fresha, Squire y theCut: tabla comparativa y mejores ideas |
| [docs/03-recordatorios-whatsapp.md](docs/03-recordatorios-whatsapp.md) | Costo por mensaje frente a la competencia, opciones de número y flujo de recordatorios |
| [docs/04-agendamiento.md](docs/04-agendamiento.md) | Reglas de la agenda: flujo, estados, cancelación, reprogramación e inasistencias |
| [docs/05-alcance.md](docs/05-alcance.md) | MVP (fase 1) y fases siguientes |
| [docs/06-roles-permisos.md](docs/06-roles-permisos.md) | Cliente, barbero y administrador |
| [docs/07-stack.md](docs/07-stack.md) | Stack recomendado y justificación |
| [docs/08-estructura-monorepo.md](docs/08-estructura-monorepo.md) | Árbol de `apps/` y `packages/` y reglas de modularidad |
| [docs/09-modelo-datos.md](docs/09-modelo-datos.md) | Tablas, relaciones, funciones y políticas RLS en Supabase |
| [docs/10-riesgos-decisiones-abiertas.md](docs/10-riesgos-decisiones-abiertas.md) | Riesgos y decisiones pendientes |
| [docs/11-interfaz.md](docs/11-interfaz.md) | Interfaz minimalista: principios, paleta, tipografía, pantallas del cliente y del barbero, y lo que muestran las capturas de Beunik |
| [docs/marca/](docs/marca/) | Logo de Possos Barber |
| [docs/fuentes.md](docs/fuentes.md) | Fuentes consultadas, con URL y fecha |

Para leer en orden: empieza por 00, sigue con 03 (el porqué del proyecto) y luego 04 y 05.

## Construcción

El plan está en [fases/](fases/README.md): de F0 (base del monorepo) a F9 (lanzamiento y salida de Beunik), más F10 con lo que viene después del MVP.

## Desarrollo local

Requisitos: Node 24 (ver `.nvmrc`), pnpm 12 y Docker (Docker Desktop o Colima) para Supabase.

```sh
pnpm install
pnpm db:start              # Supabase local en Docker; imprime las claves
cp .env.example apps/web/.env.local   # y llena los valores que imprimió db:start
pnpm dev                   # http://localhost:3000
```

| Comando | Qué hace |
|---|---|
| `pnpm turbo run build lint typecheck test` | Build, lint, tipos y Vitest de todos los paquetes |
| `pnpm --filter web test:e2e` | Playwright a 390 px. Usa el `pnpm dev` que esté corriendo o levanta uno. La primera vez: `pnpm --filter web exec playwright install chromium` |
| `pnpm depcruise` | Revisa las reglas de modularidad de [docs/08](docs/08-estructura-monorepo.md#reglas-de-modularidad) |
| `pnpm format` / `pnpm format:check` | Prettier |
| `pnpm db:test` | Pruebas pgTAP de `supabase/tests/` |
| `pnpm db:reset` | Recrea la base local con las migraciones y `supabase/seed.sql` |
| `pnpm db:types` | Regenera `packages/supabase/src/database.types.ts` desde la base local |
| `pnpm db:stop` | Apaga Supabase local |

Con `pnpm dev`, `http://localhost:3000/muestras` muestra todos los componentes de `@possos/ui` y sus estados. Esa página solo existe en desarrollo. Desde un celular en la misma red Wi-Fi se abre con la URL de la línea `Network:` que imprime `pnpm dev` (por ejemplo, `http://192.168.1.67:3000/muestras`).

Supabase local usa los puertos 55320 a 55329 (API en `http://127.0.0.1:55321`, Studio en `http://127.0.0.1:55323`) para no chocar con otros proyectos.
