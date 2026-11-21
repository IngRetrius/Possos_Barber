# Entrega de F1

Estado de `packages/ui` al cerrar [F1](F1-sistema-diseno.md), el 19/11/2026. Es el punto de partida de F3 en adelante, que arman pantallas con estos componentes. Lo anterior sigue en [F0-entrega.md](F0-entrega.md); las reglas, en [CLAUDE.md](../CLAUDE.md). Este documento cuenta lo que existe y lo que no es evidente al leer el código.

## Qué existe

| Pieza | Dónde | Notas |
|---|---|---|
| Tokens, tipografía, radios, zonas seguras, movimiento y foco | `packages/ui/src/styles.css` (`@possos/ui/styles.css`) | `apps/web/app/globals.css` lo importa después de `tailwindcss` |
| Colores para lo que no es CSS | `colors` de `@possos/ui` | Para `themeColor`, el manifiesto de F8 o un correo. En componentes se usan clases |
| Formato | `formatDate`, `formatDateLong`, `formatTime`, `formatTimeShort`, `formatTimeRange`, `formatMonthYear`, `formatPrice`, `formatDuration`, `formatWeekdayShort`, `dayPeriod`, `toDateKey`, `bogotaParts` | Todo en hora de Bogotá, sin importar la zona del servidor |
| Componentes | `@possos/ui` | `Button`, `BottomBar`, `TabBar`, `StepHeader`, `DateStrip`, `SlotGrid`, `SlotGridSkeleton`, `Sheet`, `SheetTrigger`, `SheetClose`, `List`, `ListRow`, `StatusBadge`, `Skeleton`, `EmptyState`, `InlineError`, `Toaster`, `toast`, `Field`, `Input`, `PhoneInput`, `Textarea`, `Checkbox`, `Logo`, `cn` |
| Monograma | `packages/ui/src/internal/components/logo-paths.ts` | Trazos del vector pasado desde el PNG del dueño el 20/11/2026 (antes, tres PNG recortados). El archivo está en `docs/marca/logo-possos.svg` |
| Íconos de la PWA | `apps/web/public/icons/` | `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`. Todavía no los usa ningún manifiesto (F8) |
| Página de muestras | `apps/web/app/muestras/page.dev.tsx` | Todos los componentes y estados. Ver [Cómo verla](#cómo-ver-la-página-de-muestras) |
| Reglas de lint | `packages/config/eslint/possos-plugin.js` | `possos/no-raw-color` y `possos/no-emoji`, en todos los paquetes |
| Pruebas | `packages/ui/src/internal/*.test.ts`, `apps/web/e2e/` | Vitest (formato, tokens y contrastes, `cn`) y Playwright a 390 px con axe. Job `e2e` en CI |

## Cómo ver la página de muestras

- `pnpm dev` en la raíz y abrir `http://localhost:3000/muestras`.
- **Desde un celular en la misma red Wi-Fi:** `http://<IP del Mac>:3000/muestras`. La IP sale en la línea `Network:` que imprime `pnpm dev` (el 19/11/2026 era `192.168.1.67`). Funciona porque `next.config.ts` permite las IP `192.168.*.*` y `10.*.*.*` en `allowedDevOrigins`. Sin eso, Next 16 bloquea los recursos de desarrollo y la página carga pero no responde a los toques.
- **No existe en producción:** `possos-web.vercel.app/muestras` da 404 a propósito.

## Lo no evidente

### Estilos

- **Tailwind no tiene su paleta, ni sus tamaños de texto, ni sus sombras.** `bg-red-500`, `text-sm` o `shadow-md` no generan nada. Colores: `bg`, `surface`, `surface-2`, `border`, `border-strong`, `fg`, `fg-muted`, `fg-subtle`, `brand`, `accent`, `accent-fg`, `success`, `warning`, `danger` (y los alias de shadcn: `background`, `primary`, `muted-foreground`...). Texto: `text-title`, `text-heading`, `text-body`, `text-label`, `text-caption`. Radios: `rounded-sm` (casillas), `rounded-card`, `rounded-t-sheet`, `rounded-pill`. Margen lateral: `px-gutter`. Zona segura: `pt-safe`, `pb-safe`, `pb-safe-3` (12 px más la zona), etc.
- **`--accent` es el amarillo**, no el gris de hover de shadcn. Al copiar un componente de shadcn, su `hover:bg-accent` pasa a `hover:bg-surface-2`.
- **Si se agrega una clase propia nueva** (un tamaño, radio o espacio), hay que sumarla a `extendTailwindMerge` en `packages/ui/src/internal/cn.ts`. Si no, `cn()` puede borrarla al mezclarla con otra (por ejemplo, tomar `text-title` por un color).
- **Tailwind escanea `packages/ui`** por el `@source "./"` dentro de `styles.css`. La app no tiene que declarar nada más.
- **Ningún color va escrito a mano** en TS o TSX: la regla `possos/no-raw-color` lo rechaza (también en `bg-[#...]`). Los únicos archivos con valores son `styles.css` y `tokens.ts`, y una prueba verifica que coincidan entre sí y con la tabla de [docs/11](../docs/11-interfaz.md#color).

### Componentes

- **Las barras inferiores (`BottomBar`, `TabBar`) son `sticky`**, no `fixed`. Van como último hijo de un contenedor `flex min-h-dvh flex-col`; así quedan abajo sin tapar el contenido y sin espaciador.
- **`ui` importa `next/link`** (`next` es *peer dependency*). `StepHeader` recibe `backHref` u `onBack`; `ListRow` recibe `href` u `onClick`; para un botón que es enlace se usa `<Button asChild><Link .../></Button>`.
- **`Sheet`** abre con el foco adentro (`autoFocus`), cierra con Escape, con "Cerrar", arrastrando y con el gesto atrás: al abrir agrega una entrada al historial con la misma URL. Si una acción de la hoja navega a otra página, hay que cerrarla primero y navegar en el siguiente render; si no, la vuelta atrás que limpia el historial puede deshacer la navegación. No se apilan hojas ni se usan en el flujo de reserva.
- **`DateStrip` recibe días como `YYYY-MM-DD`** (usar `toDateKey`) con su número de horas libres. Con `slots: 0` se ve apagado, dice "Sin horas" y se puede elegir; con `disabled` no se puede elegir y las flechas lo saltan. **`SlotGrid` recibe instantes ISO** y los agrupa en mañana (antes de las 12), tarde (12 a 6 p. m.) y noche (desde las 6). Ambos son radios nativos: el teclado y los lectores de pantalla funcionan sin código propio.
- **`Field` conecta solo** el `Input`, `PhoneInput` o `Textarea` que tenga adentro (id, `aria-describedby`, `aria-invalid`). `Checkbox` lleva su propio texto, ayuda y error.
- **`PhoneInput` no valida**: muestra el +57 fijo y pide hasta 10 dígitos. La validación del celular colombiano y el formato E.164 son de F3.
- **`StatusBadge` recibe un tono** (`success`, `warning`, `danger`, `neutral`) y un texto, porque `ui` no conoce las citas. La tabla de estado a tono y texto está en la página de muestras y debe pasar a `@possos/booking`: `confirmed` Confirmada (success), `booked` Sin confirmar (warning), `pending_approval` Pendiente de aprobación (warning), "Por cerrar" (warning), `no_show` No vino (danger), `completed` Completada, `cancelled` Cancelada y `rejected` Rechazada (neutral).
- **`Toaster` no está en el layout raíz**; solo en la página de muestras. Se agrega al layout cuando la primera pantalla real use `toast`.
- **`Logo`** pinta el SVG en línea con `currentColor` en `--brand`. `label=""` lo vuelve decorativo (cuando el nombre ya está escrito al lado). `LogoIntro` es el mismo logo con el tijeretazo de la portada del inicio ([docs/11](../docs/11-interfaz.md#logo)).
- **`ScrollReveal`** no pinta nada: se monta una vez en la página y hace aparecer al bajar cada sección marcada con `data-reveal=""` ([docs/11](../docs/11-interfaz.md), "Secciones al bajar"). Anima los hijos directos de la sección, así que el título debe ser el primero.

### Formato

- **Los nombres de días y meses están escritos en el código** (no los da `Intl`), para que el texto sea igual en Safari, Chrome y Node. Septiembre abreviado es "sept".
- **Las horas llevan espacio que no se parte** (U+00A0): `formatTime` devuelve `"3:00 p. m."`. En pruebas se escribe el escape ` `; un espacio que no se parte pegado tal cual en el código lo rechaza ESLint (`no-irregular-whitespace`).
- **Un `YYYY-MM-DD` se toma como día del calendario**, no como medianoche UTC: `formatDate("2026-11-20")` es "vie 20 nov" en cualquier servidor.

### Next y herramientas

- **Páginas solo de desarrollo:** se llaman `page.dev.tsx`. `next.config.ts` solo cuenta la extensión `.dev.tsx` con `next dev`, así que el build de producción no las genera.
- **Imágenes dentro de un paquete:** `import img from "./x.png"` funciona porque el paquete está en `transpilePackages`. Para los tipos del paquete hay un `declare module "*.png"` en `packages/ui/src/internal/assets.d.ts`.
- **TypeScript 6 no carga `@types/*` si no se piden.** Un paquete con pruebas que usan `node:fs` o `process` necesita `@types/node` y `"types": ["node"]` en su `tsconfig.json` (como `packages/ui`).
- **`apps/web` declara su propio `lucide-react`** (la misma versión que `ui`, 1.75.0) para los íconos que pasa a `TabBar`. Si se actualiza uno, se actualiza el otro.

### Playwright

- `pnpm --filter web test:e2e`. La primera vez en un equipo: `pnpm --filter web exec playwright install chromium`.
- En local reutiliza un `pnpm dev` que ya esté corriendo en el puerto 3000; si no hay, lo levanta. En CI siempre levanta el suyo.
- **El `webServer` lanza `next dev` directo, con `gracefulShutdown`.** Con `pnpm exec next dev`, el servidor no se apagaba al terminar y el job de CI quedaba colgado con las pruebas ya en verde. El job tiene `timeout-minutes: 15` por si vuelve a pasar.
- Proyecto único `celular-390`: Chromium a 390 × 844, táctil. Para tocar un radio o una casilla se toca su `label` (el `input` es invisible).

### Repo

- `next dev` crea `apps/web/AGENTS.md` (un aviso en inglés de Next para agentes). Está sin seguimiento en git: **pendiente** decidir si se sube o se agrega a `.gitignore`.

## Pendiente

- **Del dueño:** visto bueno de la paleta y de Geist (verlo en su celular con la URL de arriba) y el logo en SVG ([decisión 11](../docs/10-riesgos-decisiones-abiertas.md)).
- **En celulares reales:** VoiceOver y TalkBack en la tira de días y la cuadrícula, el gesto atrás de Android en la hoja y la barra inferior con el teclado abierto en iOS ([docs/11](../docs/11-interfaz.md#verificar-al-implementar)).
- Lo pendiente de [F0-entrega](F0-entrega.md#pendiente-fuera-del-código) sigue igual.
