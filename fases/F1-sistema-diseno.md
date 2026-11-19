# F1. Sistema de diseño

## Objetivo

Que `packages/ui` tenga los tokens, la tipografía, el logo y los componentes que usan todas las pantallas, siguiendo [docs/11-interfaz.md](../docs/11-interfaz.md). Al terminar, las fases siguientes arman pantallas sin decidir colores ni tamaños.

**Depende de:** F0. **Toca:** `packages/ui` y una página interna de muestras en `apps/web`.

## Tareas

### Tokens y base

- [ ] Tokens de color de [docs/11](../docs/11-interfaz.md#color) en CSS con `@theme` de Tailwind v4, mapeados a las variables de shadcn/ui (`--background`, `--foreground`, `--primary`, `--border`, etc.).
- [ ] Tipografía Geist con `next/font`, estilos `title`, `heading`, `body`, `label` y `caption`, y la utilidad de cifras tabulares.
- [ ] Rejilla de 4 px, radios (12, 20 y píldora) y margen lateral de 16 px.
- [ ] `viewport-fit=cover` y utilidades de zona segura (`env(safe-area-inset-*)`).
- [ ] Movimiento de 150 a 200 ms y la variante para `prefers-reduced-motion`.
- [ ] Anillo de foco amarillo de 2 px en todo lo que se puede tocar.

### Logo

- [ ] Recortar el monograma de [docs/marca/logo-possos-negro.png](../docs/marca/logo-possos-negro.png), quitar el fondo y exportar a 1x, 2x y 3x. Reemplazarlo por el SVG cuando el dueño lo entregue.
- [ ] Componente `<Logo />` con el gris `--brand`.
- [ ] Íconos de la PWA (192, 512 y *maskable*) con el monograma sobre `#0B0B0B`. Se usan en F8.

### Componentes

Se copian de shadcn/ui y se adaptan a los tokens. Ninguno sabe de citas ni de clientes (el paquete `ui` no tiene dominio).

- [ ] `Button`: principal (amarillo), secundario (borde), fantasma y peligro. 48 px de alto.
- [ ] `BottomBar`: barra fija inferior con resumen opcional y un botón, que respeta la zona segura.
- [ ] `StepHeader`: botón atrás, "Paso n de m · Nombre".
- [ ] `DateStrip`: tira horizontal de días con estado elegido, apagado y "Sin horas". Navegable con flechas del teclado.
- [ ] `SlotGrid`: cuadrícula de 3 columnas agrupada por "Mañana", "Tarde" y "Noche", con elección única (`role="radiogroup"`).
- [ ] `Sheet`: hoja inferior (Drawer de shadcn, sobre vaul) con botón "Cerrar" visible y cierre con el gesto atrás.
- [ ] `ListRow`: fila de 64 px con título, detalle y valor a la derecha.
- [ ] `StatusBadge`: punto y texto para los estados de [docs/04](../docs/04-agendamiento.md#estados-de-la-cita), con los colores de [docs/11](../docs/11-interfaz.md#color).
- [ ] `Skeleton`, `EmptyState`, `InlineError` y avisos (`Sonner`).
- [ ] `TabBar`: navegación inferior de 4 pestañas con ícono y etiqueta.
- [ ] Campos: `Input`, `PhoneInput` (prefijo +57), `Checkbox` y `Textarea`, todos a 16 px para que iOS no haga zoom.
- [ ] Formato compartido de fechas, horas y precios en `es-CO` y `America/Bogota` ("jue 20 nov", "3:00 p. m.", "$35.000").

### Página de muestras

- [ ] Ruta interna (solo en desarrollo) con todos los componentes y estados, a 390 px.

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
