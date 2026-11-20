# F1. Sistema de diseño

## Objetivo

Que `packages/ui` tenga los tokens, la tipografía, el logo y los componentes que usan todas las pantallas, siguiendo [docs/11-interfaz.md](../docs/11-interfaz.md). Al terminar, las fases siguientes arman pantallas sin decidir colores ni tamaños.

**Depende de:** F0. **Toca:** `packages/ui` y una página interna de muestras en `apps/web`.

## Tareas

### Tokens y base

- [x] Tokens de color de [docs/11](../docs/11-interfaz.md#color) en CSS con `@theme` de Tailwind v4, mapeados a las variables de shadcn/ui (`--background`, `--foreground`, `--primary`, `--border`, etc.).
- [x] Tipografía Geist con `next/font`, estilos `title`, `heading`, `body`, `label` y `caption`, y la utilidad de cifras tabulares.
- [x] Rejilla de 4 px, radios (12, 20 y píldora) y margen lateral de 16 px.
- [x] `viewport-fit=cover` y utilidades de zona segura (`env(safe-area-inset-*)`).
- [x] Movimiento de 150 a 200 ms y la variante para `prefers-reduced-motion`.
- [x] Anillo de foco amarillo de 2 px en todo lo que se puede tocar.

### Logo

- [x] Recortar el monograma de [docs/marca/logo-possos-negro.png](../docs/marca/logo-possos-negro.png), quitar el fondo y exportar a 1x, 2x y 3x. Reemplazarlo por el SVG cuando el dueño lo entregue.
- [x] Componente `<Logo />` con el gris `--brand`.
- [x] Íconos de la PWA (192, 512 y *maskable*) con el monograma sobre `#0B0B0B`. Se usan en F8.

### Componentes

Se copian de shadcn/ui y se adaptan a los tokens. Ninguno sabe de citas ni de clientes (el paquete `ui` no tiene dominio).

- [x] `Button`: principal (amarillo), secundario (borde), fantasma y peligro. 48 px de alto.
- [x] `BottomBar`: barra fija inferior con resumen opcional y un botón, que respeta la zona segura.
- [x] `StepHeader`: botón atrás, "Paso n de m · Nombre".
- [x] `DateStrip`: tira horizontal de días con estado elegido, apagado y "Sin horas". Navegable con flechas del teclado.
- [x] `SlotGrid`: cuadrícula de 3 columnas agrupada por "Mañana", "Tarde" y "Noche", con elección única (`role="radiogroup"`).
- [x] `Sheet`: hoja inferior (Drawer de shadcn, sobre vaul) con botón "Cerrar" visible y cierre con el gesto atrás.
- [x] `ListRow`: fila de 64 px con título, detalle y valor a la derecha.
- [x] `StatusBadge`: punto y texto para los estados de [docs/04](../docs/04-agendamiento.md#estados-de-la-cita), con los colores de [docs/11](../docs/11-interfaz.md#color).
- [x] `Skeleton`, `EmptyState`, `InlineError` y avisos (`Sonner`).
- [x] `TabBar`: navegación inferior de 4 pestañas con ícono y etiqueta.
- [x] Campos: `Input`, `PhoneInput` (prefijo +57), `Checkbox` y `Textarea`, todos a 16 px para que iOS no haga zoom.
- [x] Formato compartido de fechas, horas y precios en `es-CO` y `America/Bogota` ("jue 20 nov", "3:00 p. m.", "$35.000").

### Página de muestras

- [x] Ruta interna (solo en desarrollo) con todos los componentes y estados, a 390 px.

## Criterios de aceptación

- La página de muestras se ve completa a 390 px sin desplazamiento horizontal.
- Todos los textos y bordes de componentes cumplen los contrastes de [docs/11](../docs/11-interfaz.md#color), medidos con una herramienta.
- Todo control mide al menos 48 px de alto, o 44 px con área táctil ampliada en íconos sueltos.
- `DateStrip`, `SlotGrid` y `Sheet` se pueden usar solo con teclado y se anuncian bien en VoiceOver.
- No hay emojis ni colores fuera de los tokens (una regla de lint o una búsqueda en CI lo revisa).

## Pruebas

- Vitest para el formato de fechas, horas y precios (incluye medianoche, mediodía y el cambio de mes).
- Playwright a 390 px sobre la página de muestras, con `@axe-core/playwright` para accesibilidad.

## Necesita del dueño

- Visto bueno de la paleta y de Geist (se muestra la página de muestras en su celular).
- El logo en SVG ([decisión 11](../docs/10-riesgos-decisiones-abiertas.md)).

## Cierre (19/11/2026)

### Qué quedó y dónde

| Pieza | Dónde |
|---|---|
| Tokens, escala tipográfica, radios, zonas seguras, movimiento y foco | `packages/ui/src/styles.css`, exportado como `@possos/ui/styles.css`. `apps/web/app/globals.css` lo importa después de Tailwind |
| Colores para lo que no es CSS (`themeColor`, manifiesto de F8) | `colors` de `@possos/ui` (`src/internal/tokens.ts`) |
| Formato de fechas, horas, precios y duraciones | `formatDate`, `formatDateLong`, `formatTime`, `formatTimeShort`, `formatTimeRange`, `formatMonthYear`, `formatPrice`, `formatDuration`, `dayPeriod` y `toDateKey` de `@possos/ui` |
| Componentes | `packages/ui/src/internal/components/`, exportados desde `@possos/ui` |
| Monograma sin fondo, 1x, 2x y 3x (alto 64, 128 y 192 px) | `packages/ui/src/assets/` |
| Íconos de la PWA (192, 512, *maskable* 512 y `apple-touch-icon` 180) | `apps/web/public/icons/` |
| Página de muestras | `http://localhost:3000/muestras` con `pnpm dev`. El archivo es `page.dev.tsx` y `next.config.ts` solo cuenta esa extensión con `next dev`: en el build de producción la ruta no existe (verificado en la lista de rutas del build) |
| Regla de colores y emojis | `possos/no-raw-color` y `possos/no-emoji` en `packages/config/eslint/possos-plugin.js`, activas en el lint de todos los paquetes |
| Pruebas | Vitest en `packages/ui/src/internal/*.test.ts` (formato, tokens y contrastes, `cn`); Playwright en `apps/web/e2e/` con `pnpm --filter web test:e2e`, y un job nuevo `e2e` en CI |

### Cómo se cumplen los criterios

- **390 px:** Playwright comprueba que `scrollWidth` no pasa de 390.
- **Contraste:** `tokens.test.ts` mide con culori (`wcagContrast`) cada texto sobre `--bg`, `--surface` y `--surface-2` (4,5:1), y los bordes y el foco (3:1). axe-core revisa además el texto ya pintado en la página y en la hoja abierta. Los valores medidos coinciden con la tabla de docs/11.
- **Tamaño táctil:** Playwright mide cada botón, enlace, campo y etiqueta de radio o casilla.
- **Teclado y lector de pantalla:** `DateStrip` y `SlotGrid` usan radios nativos dentro de un `role="radiogroup"`; Playwright prueba las flechas, el espacio y el nombre que se anuncia (por ejemplo, "jueves 19 de noviembre, 7 horas libres" y "3:00 p. m."). `Sheet` atrapa el foco, cierra con Escape, con "Cerrar" y con atrás, y devuelve el foco al botón que la abrió.
- **Colores y emojis:** la regla de lint, y además Tailwind sin su paleta por omisión (`--color-*: initial`): `bg-red-500` no existe.

### Decisiones tomadas en la fase

- **`StatusBadge` recibe un tono, no un estado** (`success`, `warning`, `danger`, `neutral`), porque `ui` no conoce las citas. La tabla de estado a tono y texto queda en la página de muestras y pasa a `@possos/booking` en F4 y F6: `confirmed` Confirmada, `booked` Sin confirmar, `pending_approval` Pendiente de aprobación, "Por cerrar", `no_show` No vino, `completed` Completada, `cancelled` Cancelada y `rejected` Rechazada. Los textos de completada, cancelada y rechazada no estaban en docs/11.
- **`--accent` es el amarillo de docs/11**, no el gris de hover de shadcn. Al copiar otro componente de shadcn, su `bg-accent` de hover pasa a `bg-surface-2`.
- **Los nombres de días y meses están escritos en el código**, no pedidos a `Intl`: cada motor abrevia distinto ("jue." o "jue", "sep" o "sept"). `Intl` solo convierte a la hora de Bogotá. Las horas usan espacio que no se parte: "3:00 p. m." nunca queda partido entre dos líneas.
- **Un día "Sin horas" se puede elegir** (para mostrar "Ver la próxima hora libre"); un día apagado (`disabled`) no, y las flechas lo saltan.
- **Las barras inferiores son `sticky`**: van como último hijo de un contenedor `flex min-h-dvh flex-col`. No necesitan espaciador.
- **Casilla marcada en blanco, no en amarillo**, para que el amarillo siga siendo solo la acción principal.
- **El botón principal deshabilitado se ve gris**, no amarillo apagado.
- **`Logo`** es un SVG en línea pintado con `--brand`; cambiar el gris es cambiar el token. Desde el 20/11/2026 usa el vector pasado desde el PNG (antes eran tres PNG como máscara).
- **`Sheet` y la navegación:** si una acción de la hoja navega a otra página, se cierra primero y se navega en el siguiente render (comentario en `sheet.tsx`).
- **Geist 1.9.2 tiene cifras tabulares**: sin `tnum` las cifras miden de 384 a 663 unidades, con `tnum` todas miden 600 (revisado con fontTools; Playwright lo comprueba en la página).

### Pendiente

- Del dueño: visto bueno de la paleta y de Geist en su celular, y el logo en SVG.
- Probar en un iPhone con VoiceOver y en un Android con TalkBack: la tira de días, la cuadrícula, la hoja con el gesto atrás de Android y la barra inferior con el teclado abierto. Playwright revisa el árbol de accesibilidad en Chromium, pero no reemplaza un lector de pantalla real. Queda para la ronda de celulares de F9 o antes, cuando el dueño vea la página.
