# 11. Interfaz: agendamiento minimalista y moderno

Investigado el 19/11/2026. Fuentes en [fuentes.md](fuentes.md#interfaz). Este documento define cómo se ve y cómo se comporta la interfaz del cliente y del barbero. Las reglas de negocio están en [04](04-agendamiento.md) y el alcance en [05](05-alcance.md).

## Decisiones

| # | Decisión | Por qué |
|---|---|---|
| 1 | **Monocromo con un solo acento.** Negro, blancos y grises tomados del logo. El amarillo neón solo marca la acción principal y lo que el cliente eligió | Decisión del 19/11/2026. El logo es gris sobre negro; el amarillo mantiene el vínculo con los videos de Instagram sin llenar la pantalla |
| 2 | **Una decisión por pantalla**, con la acción principal en una barra fija abajo, al alcance del pulgar | Flujo por pasos (NN/g, *Wizards*) y diseño para el celular primero (regla 9) |
| 3 | **El flujo se acorta solo**: si hay un barbero, se salta su paso; si hay un servicio, se preselecciona y el flujo empieza en el horario | Menos toques. El indicador de progreso muestra solo los pasos que el cliente va a recorrer (Baymard) |
| 4 | **Días en una tira horizontal y horas en una cuadrícula vertical** | Las horas son muchas y se leen mejor en vertical; los días son pocos (máximo 30) y ordenados. Nada de selectores giratorios |
| 5 | **La cuenta se pide al final**, en el paso de confirmar, sin perder lo elegido | Ya estaba en [04](04-agendamiento.md); Baymard lo respalda |
| 6 | **Hojas inferiores solo para tareas cortas** (detalle de una cita en la agenda, confirmar una cancelación). Nunca para el flujo de reserva | NN/g, *Bottom Sheets* (2023) |
| 7 | **Objetivos táctiles de 48 px de alto** en horas, filas y botones | Por encima de WCAG 2.2 AA (24 px) y en línea con Apple (44 pt) y Material (48 dp) |
| 8 | **El inicio del barbero es la agenda de hoy**, no un menú de íconos | Lo que muestran las capturas de Beunik PRO (abajo) |
| 9 | **Tipografía Geist** en toda la interfaz, con cifras tabulares en horas y precios | Propuesta, ver [Tipografía](#tipografía). Reemplaza a Poppins en la app; Poppins sigue en los videos |

## Qué significa "minimalista y moderno" aquí

Son reglas que se pueden revisar en cada pantalla:

1. **Una pregunta por pantalla.** "¿Qué servicio?", "¿Qué día y a qué hora?", "¿Confirmas?".
2. **Un solo elemento amarillo a la vez por zona**: la hora elegida en la cuadrícula y el botón que avanza en la barra inferior. Títulos, íconos y enlaces no usan el acento.
3. **Texto antes que íconos.** Todo ícono de navegación lleva su etiqueta. Sin emojis, sin ilustraciones decorativas, sin fotos de banco.
4. **Bordes de 1 px en lugar de sombras.** En fondo negro las sombras no se ven; la jerarquía sale del tono de la superficie y del espacio.
5. **Cifras tabulares** en horas, precios y contadores, para que las columnas no bailen.
6. **Los estados se diseñan**: cargando, vacío, error y "esa hora se acaba de ocupar" tienen su pantalla, no un mensaje genérico.
7. **Nada que no sirva a la tarea**: sin publicidad de terceros, sin métricas de vanidad, sin ventanas que vendan algo.

## Lo que dice la investigación

| Tema | Evidencia | Cómo se aplica |
|---|---|---|
| Flujo por pasos | NN/g (*Wizards*, 2017): mostrar la estructura y el paso actual, nombrar cada paso, dar "Siguiente" y "Atrás", y reutilizar lo que la persona eligió antes como valor por omisión | Encabezado con "Paso 2 de 3 · Horario". Botón atrás arriba a la izquierda y gesto de atrás del sistema. "Volver a reservar" abre el flujo con el servicio y el barbero de la última cita |
| Cuenta al final | Baymard (2023): el 42 % de los sitios pide crear cuenta antes o durante el pago, y eso distrae y hace dudar. Rinde mejor ofrecerla después | El cliente elige servicio y hora sin sesión. En "Confirmar" aparecen "Continuar con Google" y "Usar mi correo"; al volver, el resumen sigue igual |
| Indicador de progreso | Baymard: el indicador debe reflejar uno a uno los pasos reales | Si el paso del barbero se salta, el indicador dice "de 3", no "de 4" |
| Fechas sin ambigüedad | NN/g (*Date Input*): si las fechas posibles son pocas, listarlas; escribir el mes con letras para no confundir día y mes | Formato "jue 20 nov" con `Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota' })`. Nunca "20/11" solo |
| Claridad de horarios | Baymard (*time booking interface*): la mejor solución presenta fechas y horas con una jerarquía visual clara; cuando no se entiende, la gente pasa por alto opciones válidas | Días sin horas libres se ven apagados y dicen "Sin horas". Si el día elegido no tiene horas, botón "Ver la próxima hora libre" |
| Horas en vertical | Blogs de proveedores (no es investigación independiente): en un celular, desplazarse de lado para buscar una hora hace que se pierdan opciones; los selectores giratorios son lentos | Cuadrícula de 3 columnas agrupada en "Mañana", "Tarde" y "Noche". Se desplaza en vertical |
| Vista de columna en el celular | Cal.com ofrece tres vistas (mes, semana y columna). Proveedores derivados indican que en el celular usan la de columna, un día a la vez | Un día a la vez en el celular. En escritorio, la tira de días se vuelve un mes y las horas quedan al lado |
| Resumen antes de confirmar | Fresha muestra servicio, fecha y hora, profesional, precio total e información del negocio en la revisión final | El resumen de "Confirmar" lleva lo mismo más la política de cancelación de 2 h |
| Reserva dentro de la marca | Squire dice que su reserva vive en la página de marca del negocio y critica que otros redirigen a una página de la plataforma (afirmación de un competidor) | Todo el flujo vive en el dominio de Possos Barber, con su logo. Es la razón de ser del proyecto |
| Hojas inferiores | NN/g (2023): cerrar con el gesto atrás y con un botón visible; no apilar hojas; usarlas solo para interacciones cortas; no reemplazar con ellas el paso de una página a otra | Detalle de cita, "¿Cancelar esta cita?" y filtros del barbero. El flujo de reserva usa páginas |
| Carga | NN/g (*Skeleton Screens*): los esqueletos indican la estructura mientras carga; no reemplazan la optimización | Esqueleto de la cuadrícula de horas al cambiar de día. Los enlaces que abren un paso se cubren con un pulso suave mientras llega la página (`LinkPending`). En los dos casos, si la respuesta tarda menos de 300 ms no se muestra nada. Sin `loading.tsx` en la reserva: sin JavaScript dejaría la página en "Cargando" |
| Una o varias páginas | Baymard (*one-page checkout*): una sola página no rinde más que varios pasos bien hechos; las comparaciones que la favorecen suelen enfrentarla a un flujo sin optimizar. Guías de diseño (Visa, Comisión Europea): no meter contenido largo ni interactivo en un acordeón | El inicio no carga la agenda completa: cada servicio muestra sus próximas horas, que llevan directo a "Confirmar". La agenda completa sigue en su paso |
| Tamaño táctil | WCAG 2.2, criterio 2.5.8 (AA): 24 × 24 px como mínimo. Apple: 44 × 44 pt. Material: 48 × 48 dp | Mínimo de diseño: 48 px de alto para horas, filas y botones; 44 px para íconos sueltos (con área táctil ampliada) |
| Modo oscuro | NN/g: la gente elige el modo en el sistema, no en cada app. El contraste excesivo produce halo al leer; hay que cuidar que el foco del teclado se vea | Solo modo oscuro en el MVP (decisión de marca). Texto `#F5F5F5` en vez de blanco puro y fondo `#121212` en vez de negro puro (ver [Color](#color)). Anillo de foco amarillo de 2 px |

## Sistema visual

### Color

Decisión del 19/11/2026: monocromo más un acento. El gris del logo, medido en el archivo, es `#BCBCBC` sobre `#000000`. Contrastes calculados con la fórmula de WCAG 2.2 y medidos con culori en F1 (coinciden). Los valores viven en `packages/ui/src/styles.css`; una prueba verifica que sean los de esta tabla.

Escala subida un escalón el 20/11/2026 (pedido de Juan: el inicio se veía plano y muy oscuro). Con `#0B0B0B` y `#151515` las tarjetas casi no se separaban del fondo (1,08:1) y el borde tampoco se notaba (1,21:1 sobre la tarjeta); la pantalla parecía apagada de día. La guía de modo oscuro de Material y de la skill de interfaz pide superficies en capas de gris, no negro. Con la escala nueva, que es la de elevación de Material (`#121212` de fondo y `#1E1E1E` para 1 dp), la app se ve más clara, cada capa sube un tono que se nota (`#121212`, `#1E1E1E`, `#292929`) y el borde se ve (1,38:1 sobre la tarjeta). `--fg-subtle` y `--border-strong` subieron para seguir cumpliendo 4,5:1 y 3:1 sobre `--surface-2`. `--accent-fg` sigue en `#0B0B0B`: es texto sobre el amarillo, no fondo. Una prueba fija los mínimos de separación entre capas.

| Token | Valor | Contraste sobre `--bg` | Uso |
|---|---|---|---|
| `--bg` | `#121212` | | Fondo de la app |
| `--surface` | `#1E1E1E` | | Tarjetas y filas |
| `--surface-2` | `#292929` | | Hojas inferiores, elemento presionado, horas libres y panel de adicionales |
| `--border` | `#363636` | 1,6 (1,38 sobre `--surface`; decorativo) | Divisiones entre filas y tarjetas |
| `--border-strong` | `#757575` | 4,0 (3,2 sobre `--surface-2`) | Bordes de campos, chips y botones secundarios: cumplen 3:1 para componentes. En las horas libres, solo al pasar o presionar |
| `--fg` | `#F5F5F5` | 17,2 | Texto principal |
| `--fg-muted` | `#A1A1A1` | 7,3 (5,6 sobre `--surface-2`) | Texto secundario: duración, etiquetas |
| `--fg-subtle` | `#959595` | 6,2 (4,9 sobre `--surface-2`) | Texto terciario, deshabilitado con etiqueta |
| `--brand` | `#BCBCBC` | 9,9 | El gris del logo. Logo, nombre del negocio |
| `--accent` | `#F2F824` | 16,3 | Botón principal, hora elegida, anillo de foco, línea de "ahora" en la agenda |
| `--accent-fg` | `#0B0B0B` | 17,1 sobre el acento | Texto sobre el amarillo |
| `--success` | `#00F818` | 12,9 | Solo el estado "Confirmada" (punto y texto) |
| `--warning` | `#F5A524` | 9,2 | "Sin confirmar", "Pendiente de aprobación", "Por cerrar" |
| `--danger` | `#FF6B6B` | 6,8 | Errores, "Cancelar cita", "No vino" |

Reglas:

- El color nunca es la única señal: cada estado lleva texto ("Confirmada", "Sin confirmar"). Así lo entiende quien no distingue el verde.
- El verde y el ámbar no se usan en botones; solo en estados.
- Modo claro: no en el MVP. El amarillo y el verde neón no sirven como texto sobre blanco ([07](07-stack.md)), así que un modo claro necesita otros tonos de acento.
- En Tailwind v4 los tokens van en CSS con `@theme`, como variables que leen los componentes de shadcn/ui (`--background`, `--primary`, etc.). Se escriben en hex o en OKLCH; el valor visible debe ser el de esta tabla.

### Tipografía

**Propuesta: Geist** (Vercel, licencia SIL Open Font License 1.1) para toda la interfaz, cargada con `next/font`. **[PENDIENTE]** visto bueno del dueño; cambiarla es cambiar un token.

- Por qué no Poppins en la app: es geométrica y ancha, buena para títulos de video, pero en listas densas (horas, agenda) ocupa más y cansa. Geist está hecha para interfaces y para cifras alineadas.
- Una sola familia, tres pesos: 400 (texto), 500 (etiquetas y botones), 600 (títulos).
- Cifras tabulares (`font-variant-numeric: tabular-nums`) en horas, precios y contadores.

| Estilo | Tamaño / interlineado | Uso |
|---|---|---|
| `title` | 28 / 34, 600 | Título de la pantalla ("Elige tu hora") |
| `heading` | 20 / 28, 600 | Secciones ("Tarde", "Próxima cita") |
| `body` | 16 / 24, 400 | Texto general. 16 px evita que iOS haga zoom al tocar un campo |
| `label` | 15 / 20, 500 | Botones, horas, filas |
| `caption` | 13 / 18, 400 | Duración, ayudas, avisos |

### Espacio, forma y movimiento

- Rejilla base de 4 px. Margen lateral de 16 px en el celular. Separación de 12 px entre tarjetas y de 8 px entre horas.
- Radios: 12 px en tarjetas, horas y botones; 20 px en la parte superior de las hojas inferiores; píldora en los chips de días.
- Horas libres (20/11/2026): relleno `--surface-2` sin contorno; el contorno `--border-strong` aparece al pasar o presionar y la elegida es amarilla. Una cuadrícula de horas con contorno se veía como una pared de rectángulos iguales. La hora se reconoce por su texto, así que el relleno no necesita 3:1 (WCAG 1.4.11 pide el contraste para lo que identifica al control). El estilo vive en `slotClass` de `@possos/ui` y lo usan el paso de horario y las horas rápidas del inicio.
- Peso: el precio de cada servicio y el del total van en 600, para que se lean primero.
- Respeta las zonas seguras del iPhone con la PWA instalada: `padding-bottom: env(safe-area-inset-bottom)` en la barra inferior y `viewport-fit=cover`.
- Íconos: Lucide (viene con shadcn/ui), trazo de 1,5, 20 px, siempre con etiqueta en la navegación.
- Redes (20/11/2026, pedido de Juan): Instagram y TikTok van en Contacto solo con su ícono, en línea en `apps/web/app/_components/social-links.tsx`. Son de Phosphor 2.1.1, peso regular (MIT), porque Lucide ya no trae marcas; son de contorno y con el mismo grosor de trazo que Lucide a 24 px. Van monocromos (`--fg`), sin los colores de cada marca. Es la única excepción a "siempre con etiqueta": el nombre ("Instagram @possosbarber") va en `aria-label`, cada enlace mide 48 × 48 px con 8 px entre ellos, y el borde se refuerza al pasar o presionar. La lista se llama "Redes sociales". Las dos cuentas también van en `sameAs` de los datos estructurados.
- Movimiento: 150 a 200 ms con *ease-out* para entrar, sin rebotes. Con `prefers-reduced-motion: reduce`, solo cambios de opacidad.

### Logo

- Original del dueño: [marca/logo-possos-negro.png](marca/logo-possos-negro.png), 1490 × 1600 px, gris `#BCBCBC` sobre negro puro.
- **Vector** (20/11/2026, pedido de Juan): [marca/logo-possos.svg](marca/logo-possos.svg), pasado desde ese PNG con potrace (suavizado antes de trazar para quitar el ruido de compresión, unos 130 segmentos de curva). Coincide con el original superpuesto; a 4 aumentos se notan ondulaciones mínimas en algunos bordes rectos, invisibles a los tamaños de la app. Si el dueño tiene el archivo original de quien diseñó el logo, se cambia por ese ([10](10-riesgos-decisiones-abiertas.md), decisión 11).
- Tiene dos piezas: el **cuerpo** (la P, la diagonal y el aro izquierdo) y el **mango** (el aro derecho con su tallo, que pasa por debajo de la diagonal). `Logo` de `@possos/ui` lo pinta como SVG en línea con `currentColor` en `--brand`; con colores forzados toma el color del sistema. Los trazos viven en `packages/ui/src/internal/components/logo-paths.ts`.
- **Tijeretazo** (`LogoIntro`, solo en la portada del inicio): el mango gira 14° hacia el otro aro y vuelve, en 520 ms, 300 ms después de hidratar. Es la excepción a los 150 a 200 ms de [Espacio, forma y movimiento](#espacio-forma-y-movimiento): es la firma de la marca, no una transición de la interfaz. No esconde nada (antes de hidratar y sin JavaScript el logo se ve quieto) y no sale con `prefers-reduced-motion`.
  - **Se repite cada 8 s** mientras el logo está en pantalla y la pestaña se ve (pedido de Juan, 20/11/2026: "es algo pequeñito"; antes salía una vez por sesión). Al primer toque, tecla, rueda o desplazamiento con el dedo se queda quieto hasta que se vuelva a cargar el inicio: WCAG 2.2.2 (nivel A) pide que lo que se mueve solo por más de 5 s se pueda pausar o detener, y una animación decorativa que se repite sin fin distrae. El tijeretazo que esté en curso termina.
- Usos: encabezados de las pantallas de cuenta (28 px de alto), portada del inicio (128 px), ícono de la PWA (monograma centrado sobre `#0B0B0B`, con margen para la versión *maskable*) y pantalla de inicio de la PWA. Los íconos de la PWA (`apps/web/public/icons/`) siguen saliendo del recorte en PNG de F1.

## Pantallas del cliente

Todas se diseñan a 390 px de ancho. Los horarios y precios de los bocetos son ejemplos; los reales están **[PENDIENTE]**.

### Inicio público

```
┌──────────────────────────────────┐
│                        Ingresar  │  arriba solo la navegación, en gris
│                                  │
│               ▄▄▄                │  portada (20/11/2026): monograma de 128 px
│              [ P ]               │  con un brillo gris detrás y su tijeretazo
│               ▀▀▀                │
│        P O S S O S  B A R B E R  │  el nombre es el título (h1), en mayúsculas
│                                  │  espaciadas y en el gris del logo
│  ¡El barbero más viral de        │  frase del dueño, en gris
│            Girardot!             │
│ [           Reservar           ] │  amarillo: el único de la zona
│                                  │
│ Trabajos    Ver más en Instagram │
│ ┌───────────┐ ┌───────────┐ ┌──  │  fotos 3:4 que se deslizan de lado;
│ │           │ │           │ │    │  se ven dos y asoma la tercera
│ │   foto    │ │   foto    │ │    │
│ │           │ │           │ │    │
│ └───────────┘ └───────────┘ └──  │
│                                  │
│ Servicios                        │
│ ┌──────────────────────────────┐ │
│ │ Corte              $25.000 ˄ │ │  abierta
│ │ 60 min                       │ │
│ │ Servicio de corte que…       │ │
│ │ Agrega                       │ │
│ │ ┌──────────────────────────┐ │ │  panel --surface-2: una sola zona
│ │ │(+ Barba +$15.000 · +60 m)│ │ │  chips; marcado: invertido (✓)
│ │ │(✓ Cejas +$5.000)(+ Dis…) │ │ │
│ │ │ ──────────────────────── │ │ │
│ │ │ Total    $30.000 · 60 min│ │ │  se anuncia al cambiar
│ │ └──────────────────────────┘ │ │
│ │ Próximas horas               │ │
│ │ Hoy · jue 20 nov             │ │
│ │ [3:00 p.m.][4:00 p.m.][5:00…]│ │  enlaces a "Confirmar", con relleno y sin contorno
│ │ Mañana · vie 21 nov          │ │
│ │ [9:00 a.m.][10:00 a.m.]      │ │
│ │ Ver todas las horas        › │ │  enlace con flecha, no otra caja
│ ├──────────────────────────────┤ │
│ │ Corte a domicilio  $50.000 ˅ │ │
│ │ 2 h                          │ │
│ └──────────────────────────────┘ │
│ Color de cabello                 │  título del grupo
│ ┌──────────────────────────────┐ │
│ │ Rayos platinados  $120.000 ˅ │ │
│ ├──────────────────────────────┤ │
│ │ Global platinado  $170.000 ˅ │ │
│ └──────────────────────────────┘ │
│ El barbero · foto y presentación │
│ Ubicación · mapa · horario       │
│ [IG] [TikTok] · WhatsApp         │  redes solo con ícono, 48 px
│ ──────────────────────────────── │
│ [文A English]                    │  pie: botón de idioma
├──────────────────────────────────┤
│ [          Reservar          ]   │  barra fija; escondida mientras se ven la portada
└──────────────────────────────────┘  o los servicios
```

- **Portada** (20/11/2026, pedido del dueño: "le falta como un toque: el logo, medio animación, un tiz de color"; referencia: la portada de El Acicale, en Cali). Antes el logo solo salía a 28 px junto al nombre y el amarillo casi no se veía en el inicio, porque la barra "Reservar" se esconde mientras están los servicios.
  - El monograma a 128 px con su tijeretazo ([Logo](#logo)) y un brillo detrás: un degradado radial de `--brand` al 12 % que se desvanece, monocromo. Debajo, el nombre como título (h1) en mayúsculas espaciadas (0,2 em) y en `--brand`, la frase del dueño y "Reservar" a todo el ancho (hasta 320 px en escritorio).
  - El amarillo de la zona es "Reservar", que es la acción principal (principio 2 del color). Lleva a lo mismo que la barra: con un solo servicio sin adicionales, al horario; si no, sube a la lista y pone el foco en "Servicios". Mientras la portada se ve, la barra se esconde.
  - Entrada: el logo, el nombre, la frase y el botón aparecen y suben 8 px en 200 ms cada uno, escalonados cada 70 ms (`animate-rise`, en `@possos/ui/styles.css`). Con movimiento reducido aparecen sin moverse.
  - El Acicale usa dorado; aquí no se agrega otro color: el toque es el amarillo de los videos del dueño.
- Si el cliente ya tiene una cita próxima, su tarjeta va justo debajo de la portada ("Tu cita: jue 20 nov, 3:00 p. m.").
- **Próxima hora libre** se probó el 20/11/2026 (una tarjeta arriba con la hora más cercana del primer servicio y el botón amarillo a "Confirmar") y se quitó el mismo día por pedido de Juan: no hacía falta. Las próximas horas siguen en la tarjeta abierta de cada servicio.
- **Trabajos** (20/11/2026, con las primeras fotos de Juan). El portafolio sube de la ficha del barbero a una sección arriba de "Servicios": en una barbería el cliente elige por los cortes que ve, y es lo que le da imagen al inicio sin usar el amarillo.
  - Una fila que se desliza de lado (`PortfolioStrip` de `@possos/barbers/ui`), con *scroll snap* y sin flechas, puntos ni rotación automática. Cada foto ocupa el 44 % del ancho: se ven dos y asoma la tercera, que es la pista de que hay más (NN/g, *Mobile Carousels*: el deslizamiento es familiar, pero lo que queda fuera de pantalla se descubre menos, así que aquí solo va contenido de apoyo). En escritorio caben tres sin deslizar. La fila es enfocable para moverla con el teclado.
  - Fotos en 3:4: las del celular son verticales (9:16) y en cuadrado se cortaba la cabeza; 3:4 es también la cuadrícula de Instagram. El panel muestra el mismo recorte para que el dueño vea cómo queda cada foto.
  - "Ver más en Instagram" a la derecha del título lleva a @possosbarber.
  - Orden: el de subida (`sort_order`). Texto alternativo: la descripción del trabajo o "Trabajo de {barbero}".
  - Las dos primeras cargan de inmediato y las demás al acercarse. Sin fotos, en producción la sección no aparece; en local dice "Portafolio [PENDIENTE]".
  - **Formato.** Las fotos se suben desde el panel (Barberos, Portafolio). El navegador las reduce a 1600 px como máximo, las guarda en JPEG (al volver a codificarlas se borran los metadatos, como la ubicación) y van al bucket `portfolio` con caché de un año. `next/image` las entrega en AVIF, o en WebP al navegador que no lo lea, del ancho que pide cada pantalla: una foto de WhatsApp de 83 KB llega en unos 11 KB. No se convierten a WebP antes de subirlas porque el panel las volvería a pasar a JPEG y `next/image` ya entrega el formato moderno.
  - **Las fotos de clientes nunca van al repo**, que es público: `fotos/` está en `.gitignore`. Son datos personales (Ley 1581): el dueño debe tener la autorización de cada cliente que aparece.
- **Lo que falta no se ve en producción** (20/11/2026). La frase, la presentación y la foto del barbero, los trabajos, el mapa y el WhatsApp que el dueño todavía no entrega dicen [PENDIENTE] en local, en las pruebas y en las vistas previas de Vercel, y se omiten en producción (`SHOW_PENDING` en `apps/web/lib/business.ts`), porque el cliente veía una página a medio hacer. Sin foto, el barbero muestra sus iniciales. Los precios sin confirmar siguen diciendo [PENDIENTE] también en producción: el cliente debe saber que el valor falta antes de reservar.
- La página se renderiza en el servidor para búsquedas locales ([05](05-alcance.md)).
- Cada servicio es una fila que se despliega en el sitio (acordeón con `<details>`; abrir una cierra la otra) con la descripción completa. No es hoja inferior (principio 6) y se abre sin JavaScript. Pedido de Juan el 19/11/2026: la descripción cortada no se leía y desde el inicio no se podía reservar un servicio concreto.
- **Próximas horas** (pedido de Juan el 19/11/2026, para reservar más rápido): al abrir un servicio con un solo barbero aparecen hasta 6 horas libres de sus dos primeros días con horas, agrupadas por día ("Hoy · jue 20 nov", "Mañana · vie 21 nov" o "sáb 22 nov"; la fecha evita confundir "Mañana" con la franja de la mañana). Cada hora va completa ("3:00 p. m.") en una cuadrícula de 3 columnas de 48 px y es un enlace a "Confirmar": desde el inicio se reserva en 3 toques (abrir el servicio, la hora y "Reservar"). El lector de pantalla oye la hora y el día ("3:00 p. m., hoy, jue 20 nov"). Debajo, "Ver todas las horas" (botón secundario) abre el paso de horario de ese servicio sin pasar por el del barbero. Sin horas en la ventana: "No hay horas libres en los próximos días."
- Las horas llegan en streaming: el inicio no las espera. Hasta que llegan, y sin JavaScript (que no recibe el reemplazo), queda solo "Ver todas las horas". Si alguien toma la hora antes, "Confirmar" ya lo maneja: vuelve al horario con "Esa hora se acaba de ocupar, elige otra".
- Un servicio con varios barberos no muestra horas: "Reservar este servicio" lleva a elegir barbero.
- **Grupos y adicionales** (pedido de Juan el 20/11/2026: los combos de Beunik repetían "Corte con…" en cada fila). Los servicios se separan en Corte, Corte a domicilio y Color de cabello:
  - Los servicios sin grupo van juntos en una tarjeta. Los que tienen el mismo `category` van en su propia tarjeta bajo un título pequeño ("Color de cabello"), así el nombre del grupo no se repite en cada servicio.
  - Lo que antes eran combos ahora son **adicionales** dentro del servicio: "Agrega" con un chip por adicional (Barba +$15.000 · +60 min, Cejas +$5.000, Diseño +$5.000). Cada chip es una casilla nativa dentro de un `fieldset` (el lector anuncia "marcada"), de 48 px de alto, con ícono más o chulo: el color no es la única señal. Marcado se invierte (fondo blanco, texto negro) y no usa el amarillo, que en esta zona ya tiene la barra "Reservar" (principio 2 del color).
  - Se pueden combinar todos; cada uno suma su precio y sus minutos (decisión del 20/11/2026). "Total $45.000 · 2 h" cambia al instante y se anuncia completo (`role="status"`).
  - Marcar un chip vuelve a pedir el inicio con `?servicio=…&adicional=…` sin mover el scroll, porque las próximas horas dependen de la duración (la barba suma 1 h). La tarjeta vuelve abierta. Sin JavaScript, el botón "Ver horas con lo que agregaste" hace lo mismo.
  - Las horas rápidas, "Ver todas las horas", el resumen de "Confirmar", "Listo", Mis citas, la agenda y los avisos nombran la cita con sus adicionales: "Corte + Barba + Cejas". El total del resumen dice solo "Total".
- **La barra "Reservar" se esconde mientras la lista de servicios está en pantalla**, para que no se vean dos acciones de reservar a la vez, y aparece al bajar al barbero, al mapa o al contacto. Con un servicio sin adicionales lleva al horario; con varios, o con uno que tiene adicionales, sube a la lista y pone el foco en "Servicios". Entra en 200 ms con *ease-out* (con `prefers-reduced-motion`, solo opacidad) y escondida es `inert` e invisible. Sin JavaScript queda fija y lleva al flujo, como antes.

### Paso: Servicio

Aparece si hay más de un servicio activo o si el único tiene adicionales. Lista de filas de 64 px: nombre, duración y precio, con los mismos grupos del inicio. La duración va en minutos hasta 60 ("45 min", "60 min") y en horas desde ahí ("2 h", "1 h 30 min"), en todas las pantallas. Tocar una fila sin adicionales avanza. Una con adicionales (Corte) se abre con "Agrega", el total y "Continuar", que lleva lo elegido al paso siguiente; al volver con atrás o con "Cambiar", queda abierta con lo que se había marcado.

### Paso: Horario

```
┌──────────────────────────────────┐
│ ←  Paso 1 de 2 · Horario         │
│ Corte normal · 60 min    Cambiar │
│                                  │
│ Elige tu hora                    │
│ noviembre 2026                   │
│ ┌───┐┌───┐┌───┐┌───┐┌───┐┌──     │  tira de días, se desplaza de lado
│ │jue││vie││sáb││dom││lun││ma     │
│ │ 20││ 21││ 22││ 23││ 24││ 2     │
│ └───┘└───┘└───┘└───┘└───┘└──     │  dom: apagado, "Sin horas"
│                                  │
│ Mañana                           │
│ ┌────────┐ ┌────────┐ ┌────────┐ │
│ │  9:00  │ │ 10:00  │ │ 11:00  │ │  cuadrícula de 3 columnas, 48 px
│ └────────┘ └────────┘ └────────┘ │
│ Tarde                            │
│ ┌────────┐ ┌────────┐ ┌────────┐ │
│ │  2:00  │ │▓ 3:00 ▓│ │  4:00  │ │  3:00 elegida: fondo amarillo
│ └────────┘ └────────┘ └────────┘ │
├──────────────────────────────────┤
│ jue 20 nov · 3:00 p. m.          │
│ [         Continuar          ]   │
└──────────────────────────────────┘
```

- El día de hoy queda elegido al entrar. Si no tiene horas, se elige el primer día con horas y se dice ("Hoy no hay horas. Te mostramos el viernes 21").
- Dentro de la cuadrícula la hora va corta ("3:00") porque el grupo ("Mañana", "Tarde", "Noche") ya dice si es a. m. o p. m. La barra inferior y el lector de pantalla usan la hora completa ("3:00 p. m.").
- Las horas ocupadas no se muestran; solo las libres. Mostrar horas tachadas es ruido.
- Si alguien toma la hora mientras el cliente mira, llega el aviso por Realtime ([07](07-stack.md)), la hora desaparece y, si era la elegida, la barra inferior dice "Esa hora se acaba de ocupar, elige otra".
- La tira muestra hasta `max_days_ahead` (30 días). En escritorio se vuelve un calendario de mes al lado de las horas.

### Paso: Confirmar

```
┌──────────────────────────────────┐
│ ←  Paso 2 de 2 · Confirmar       │
│                                  │
│ Revisa tu cita                   │
│ ┌──────────────────────────────┐ │
│ │ Corte normal                 │ │
│ │ jueves 20 de noviembre       │ │
│ │ 3:00 p. m. a 4:00 p. m.      │ │
│ │ Con [barbero]                │ │
│ │ Total                 [PEND] │ │
│ │ [Dirección PENDIENTE]        │ │
│ └──────────────────────────────┘ │
│ Puedes cancelar o cambiar tu     │
│ cita hasta 2 horas antes.        │
│                                  │
│ (sin sesión)                     │
│ [  Continuar con Google      ]   │
│ [  Usar mi correo            ]   │
├──────────────────────────────────┤
│ [          Reservar          ]   │  con sesión: activo
└──────────────────────────────────┘
```

- Sin sesión, la barra inferior no aparece; los botones de cuenta ocupan su lugar. Al volver del registro, el resumen sigue igual y aparece "Reservar".
- El primer registro pide nombre, celular (para WhatsApp) y las dos autorizaciones separadas: tratamiento de datos (Ley 1581) y recibir WhatsApp. Ninguna casilla viene marcada.
- Si el cliente necesita aprobación, se avisa antes de reservar: "Tu reserva queda pendiente de que el barbero la apruebe".

### Listo

- Título "Tu cita quedó reservada" y el mismo resumen.
- "Te llega un WhatsApp para confirmar un día antes." (Solo si aceptó WhatsApp).
- Botones secundarios: "Agregar al calendario" (.ics en iPhone, iPad y Mac; Google Calendar en Android y lo demás) y, si la app no está instalada, "Instalar la app" con la guía de iOS.

### Mis citas

- Arriba, la **próxima cita** en una tarjeta con "Cambiar hora" y "Cancelar". Pasado el límite de 2 h, los botones se reemplazan por "Escríbele al barbero".
- "Cancelar" abre una hoja inferior: "¿Cancelar tu cita del jue 20 nov a las 3:00 p. m.?" con "Sí, cancelar" (rojo) y "No".
- Abajo, las pasadas en una lista simple, cada una con "Volver a reservar".
- Sin citas: "Todavía no tienes citas" y el botón "Reservar".
- Construido en F5 (19/11/2026). Además de lo anterior:
  - Si hay más de una cita próxima, las demás van en "También tienes"; cada fila abre su página (`/mis-citas/<id>`), que es también el destino de los botones de WhatsApp (F7).
  - Pasado el límite, "Escríbele al barbero" solo aparece si el barbero tiene enlace de WhatsApp; si no, "Escríbele por Instagram" (el de la barbería). Nunca un botón roto.
  - "Cambiar hora" son dos pasos, como la reserva: "Nueva hora" (el mismo selector de F4, con el servicio y el barbero de la cita) y "Confirmar". La hora actual no aparece en la cuadrícula: la ocupa la misma cita.
  - El historial muestra las 10 más recientes y "Ver todas las citas pasadas".
  - El inicio, con sesión de cliente, tiene "Mis citas" arriba, y la tarjeta "Tu próxima cita" lleva a la cita.

## Pantallas del barbero

### Hoy (inicio del panel)

```
┌──────────────────────────────────┐
│ Hoy · jue 20 nov      [+ Cita]   │
│ 6 citas · 1 sin confirmar        │
│                                  │
│ Por cerrar (1)                   │  solo si hay citas pasadas sin marcar
│ ┌──────────────────────────────┐ │
│ │ 9:00 a. m. Carlos R.         │ │
│ │ [ Vino ]      [ No vino ]    │ │
│ └──────────────────────────────┘ │
│ Pendientes de aprobar (0)        │
│                                  │
│ 10:00 ─ Andrés M.   ● Confirmada │
│ 11:00 ─ libre                    │
│ 12:00 ─ bloqueado (almuerzo)     │
│ ── ahora ─────────────────────── │  línea amarilla
│  2:00 ─ Julián P.  ● Sin confirm.│
│  3:00 ─ libre                    │
├──────────────────────────────────┤
│  Hoy   Semana   Clientes   Más   │  navegación inferior
└──────────────────────────────────┘
```

- Es una lista por hora, no una grilla de calendario: con un barbero y turnos de 60 minutos se lee mejor y cabe en 390 px.
- Tocar una hora libre abre "Nueva cita" con esa hora. Tocar una cita abre su detalle en una hoja inferior.
- Arriba van solo números que piden una acción: citas de hoy, sin confirmar, por cerrar y pendientes de aprobar.

### Detalle de una cita (hoja inferior)

- Nombre del cliente, botón "WhatsApp" (abre el chat con su número), servicio, hora y estado.
- Estado del recordatorio (F7), bajo "WhatsApp al cliente": el último mensaje ("Confirmación entregada", "Recordatorio leído", "El recordatorio falló: revisa el número"...) con su hora, y el próximo ("Próximo recordatorio: sáb 21 nov, 7:00 a. m."). El estado va con punto y texto, no solo con color. Si la cita no tiene mensajes, no aparece. En la agenda, la fila de una cita cuyo último mensaje falló dice "El recordatorio falló" con un ícono de alerta.
- Acciones según el estado: "Vino" y "No vino" (después de la hora), "Mover", "Cancelar". Cancelar pide un motivo.
- Notas privadas del barbero sobre el cliente, abajo.

### Cobro al marcar "Vino"

```
┌──────────────────────────────────┐
│ Cobro                     Cerrar │  hoja inferior
│ Carlos R. · Corte normal         │
│                                  │
│ Valor cobrado                    │
│ ┌──────────────────────────────┐ │
│ │ $ [precio de la cita]        │ │  prellenado, editable
│ └──────────────────────────────┘ │
│ Para ti (50 %)          $ ...    │  porcentaje del barbero
│ Para la barbería (50 %) $ ...    │
├──────────────────────────────────┤
│ [       Guardar cobro        ]   │
└──────────────────────────────────┘
```

- "Vino" abre esta hoja; al guardar, la cita queda `completed` y el cobro registrado. "No vino" no abre nada.
- El reparto se recalcula mientras se escribe el valor, con cifras tabulares.
- El barbero corrige el valor el mismo día desde el detalle de la cita; después, solo el administrador puede anularlo.

### Liquidación (en "Más")

- Periodo arriba: "Hoy", "Esta semana", "Esta quincena", "Este mes" o un rango.
- Tres cifras grandes: total cobrado, para el barbero y para la barbería, y debajo el número de servicios.
- Lista de cobros del periodo (fecha, cliente, servicio y valor). Los anulados se ven tachados con su motivo.
- El administrador elige el barbero o ve el total de la barbería; el barbero solo ve la suya.

### Semana

- Lista de 7 días con una barra de ocupación por día y el número de citas. Tocar un día abre "Hoy" para ese día.

### Nueva cita

- Página completa (no hoja), porque tiene búsqueda y formulario: buscar cliente por nombre o celular, o "Cliente nuevo" con nombre, celular y la autorización de datos que el cliente dio de palabra.
- Servicio y hora prellenados si se llegó desde una hora libre.
- Debajo del servicio, "Adicionales" con una casilla por cada uno del servicio elegido (20/11/2026). La base calcula la duración y el precio con ellos.
- En Más, Servicios: cada servicio tiene "Grupo" (opcional) y una fila "Adicionales" que abre su lista, con "Nuevo" y la edición de cada uno (nombre, precio en pesos, minutos que suma y "Activo").

### Más

- "Avisos" arriba, solo para quien es barbero (F8): activar los avisos push de ese celular y enviar uno de prueba.
- Liquidación, horario semanal, bloqueos, servicios, barberos y porcentajes (admin), configuración de la agenda y de los recordatorios, costo de WhatsApp del mes.

## Idiomas

Pedido de Juan el 20/11/2026: la app también en inglés, para quien no lee español.

- **Botón ES/EN**. Dice el idioma al que cambia, escrito en ese idioma, con su `lang` para el lector de pantalla. Es un formulario con una acción de servidor: funciona sin JavaScript.
  - **Inicio**: en el pie, debajo de Contacto, con el ícono de idiomas y el nombre completo ("English" en español, "Español" en inglés). No va en el encabezado, para que arriba solo quede lo de la cuenta (pedido de Juan, 20/11/2026; el logo pasó a la portada el mismo día). La barra "Reservar" es sticky: al final de la página queda debajo del pie y no lo tapa.
  - **Demás pantallas** (cuentas, pasos de la reserva, Mis citas y panel): arriba a la derecha, corto ("EN" o "ES").
- **Idioma automático**. Sin cookie, la app sale en el idioma del dispositivo (encabezado `Accept-Language` del navegador): el primero de la lista de preferencias que sea español o inglés, sin mirar la región. Si el dispositivo no está en ninguno de los dos, español. El botón manda sobre el dispositivo.
- **El idioma elegido va en una cookie** (`NEXT_LOCALE`, un año), no en la URL. Así los enlaces de WhatsApp, de los correos y de los avisos sirven igual en los dos idiomas. `<html lang>` es `es-CO` o `en`.
- **Textos**: next-intl. Cada paquete trae los suyos en `src/messages.ts` (entrada `./messages` de `exports`) y la app los junta en `apps/web/i18n/`. El inglés tiene el tipo del español, así que una clave que falta es un error de TypeScript, y una clave que no existe también.
- **Peso**: los componentes de servidor leen todos los textos; al navegador solo viajan los que usan los componentes de cliente. Fuera del panel son `ui`, `auth`, `booking`, `customers.profile` y `web.common` (`SITE_CLIENT_MESSAGES` en `apps/web/i18n/messages.ts`); el layout del panel entrega todos. Así el inicio pesa un 34 % menos (de 24 a 16 KB comprimido). Un componente de cliente nuevo fuera del panel con otro namespace se agrega a esa lista.
- **Formatos** en inglés: "Fri, Nov 20", "3:00 PM", "$35,000" (pesos con coma de miles), "50%". Los datos del dueño sin confirmar dicen [PENDING].
- **Quedan en español**: los datos del negocio (nombres de servicios, dirección, descripciones), los nombres de los festivos, el manifiesto de la PWA, los correos de Supabase, los recordatorios de WhatsApp y los avisos push al barbero (el servidor los manda sin saber el idioma de la persona). La política de datos tiene traducción, pero rige la versión en español y la página lo dice.

## Textos de la interfaz

En tuteo y sin emojis. Los botones dicen lo que pasa al tocarlos.

| Lugar | Texto |
|---|---|
| Botón principal de inicio | Reservar |
| Título del paso de horario | Elige tu hora |
| Día sin horas | Sin horas |
| Botón si el día no tiene horas | Ver la próxima hora libre |
| Hora tomada por otro | Esa hora se acaba de ocupar, elige otra |
| Política en el resumen | Puedes cancelar o cambiar tu cita hasta 2 horas antes. |
| Reserva con aprobación | Tu reserva queda pendiente de que el barbero la apruebe |
| Éxito | Tu cita quedó reservada |
| Fuera de la ventana de 2 h | Ya no puedes cambiarla desde aquí. Escríbele al barbero |
| Error de conexión | No pudimos cargar las horas. Revisa tu conexión e intenta de nuevo |

### Errores de la base

Cada código que lanzan las funciones de Postgres ([09](09-modelo-datos.md#funciones-de-postgres-api-de-escritura)) tiene un texto. Viven en `src/internal/errors.ts` de cada paquete y se prueban con Vitest. Los dos primeros son los de la tabla anterior.

| Código | Texto |
|---|---|
| `SLOT_TAKEN` | Esa hora se acaba de ocupar, elige otra |
| `TOO_LATE_TO_CANCEL` | Ya no puedes cambiarla desde aquí. Escríbele al barbero |
| `OUTSIDE_WORKING_HOURS` | Esa hora está fuera del horario del barbero |
| `IN_TIME_OFF` | El barbero no atiende a esa hora |
| `TOO_SOON` | Esa hora ya no se puede reservar. Elige una más tarde |
| `TOO_FAR` | Esa fecha todavía no está abierta para reservas |
| `SERVICE_NOT_AVAILABLE` | Ese servicio no está disponible con ese barbero |
| `NO_CUSTOMER_PROFILE` | Completa tu perfil para reservar |
| `NOT_AUTHENTICATED` | Ingresa para continuar |
| `FORBIDDEN` | No tienes permiso para hacer esto |
| `NOT_FOUND` | No encontramos esa cita (en cobros: No encontramos ese cobro; en barberos: No encontramos ese barbero) |
| `INVALID_STATUS` | Esa cita ya no se puede cambiar (en cobros: Este cobro está anulado) |
| `INVALID_INPUT` | Revisa los datos e intenta de nuevo |
| `INVALID_PERIOD` | Revisa las fechas: el final debe ser después del inicio |
| `REASON_REQUIRED` | Escribe el motivo |
| `NOT_STARTED` | Todavía no es la hora de la cita |
| `TIME_OFF_OVERLAP` | Ya tienes un bloqueo en ese horario |
| `HOURS_OVERLAP` | Dos rangos del mismo día se cruzan. Revisa las horas |
| `NOT_COMPLETED` | Primero marca que el cliente vino |
| `ALREADY_CHARGED` | Esta cita ya tiene un cobro |
| `INVALID_AMOUNT` | Escribe un valor válido |
| `NO_COMMISSION_RATE` | Falta definir el porcentaje de este barbero |
| `TOO_LATE_TO_EDIT` | Solo puedes corregir los cobros del mismo día |
| `INVALID_CUSTOMER` | Revisa el nombre y el celular (+57 y 10 dígitos) |
| Cualquier otro | No pudimos completar la acción. Intenta de nuevo |

### Cuentas (F3)

Ingreso, registro y perfil. Los errores de Supabase Auth se agrupan en `src/internal/errors.ts` de `@possos/auth`; los del celular y el perfil, en `@possos/customers`. Todos se prueban con Vitest.

| Lugar | Texto |
|---|---|
| Ingresar | Título "Ingresa", "Para reservar y ver tus citas.", "Continuar con Google" (solo si Google está activo en Supabase), "o con tu correo", "Olvidé mi contraseña", "¿No tienes cuenta? Crea una", botón "Ingresar" |
| Registrarse | "Crea tu cuenta", "Con tu cuenta reservas, cambias y cancelas tus citas.", ayuda "Mínimo 8 caracteres.", botón "Crear cuenta" |
| Después de registrarse | "Revisa tu correo", "Te enviamos un enlace a ... Ábrelo para activar tu cuenta y seguir donde ibas.", "Reenviar el enlace", "Usar otro correo" |
| Completar perfil | "Completa tu perfil" ("Actualizamos la política de datos" si cambió la versión), campos "Nombre" y "Celular" (ayuda "Para avisarte de tus citas. Nadie más lo ve."), botón "Guardar y continuar" |
| Casilla de datos (obligatoria) | "Autorizo a Possos Barber a tratar mis datos personales para agendar mis citas, según su política de tratamiento de datos." con el enlace "Leer la política de tratamiento de datos" |
| Casilla de WhatsApp (opcional) | "Quiero recibir por WhatsApp la confirmación y los recordatorios de mis citas." Ayuda: "Opcional. Sin esta autorización no te llegan los recordatorios." |
| Enlace de activación abierto en otro navegador | "Tu correo quedó confirmado. Ingresa con tu contraseña para seguir." (cambio de contraseña: "Abre el enlace en el mismo navegador donde pediste el cambio, o pide uno nuevo desde aquí.") |
| Después de ingresar o de guardar el perfil | El cliente va al inicio con la sesión abierta ("Tu perfil" arriba a la derecha). Si viene de guardar el perfil, arriba dice "Guardamos tus cambios." |
| Borrar la cuenta | Hoja "¿Borrar tu cuenta?" con "Sí, borrar mi cuenta" (rojo) y "No". Con una cita próxima: "Tienes una cita el ... a las .... Cancélala antes de borrar tu cuenta." Después: "Borramos tu cuenta y tus datos." |

| Código o caso | Texto |
|---|---|
| `INVALID_CREDENTIALS` | El correo o la contraseña no coinciden |
| `EMAIL_NOT_CONFIRMED` | Primero activa tu cuenta con el enlace que te enviamos al correo |
| `INVALID_EMAIL` | Escribe un correo válido |
| `WEAK_PASSWORD` | La contraseña debe tener al menos 8 caracteres |
| `SAME_PASSWORD` | La contraseña nueva debe ser distinta de la anterior |
| `LINK_EXPIRED` | El enlace venció o ya se usó. Pide uno nuevo |
| `GOOGLE_FAILED` | No pudimos ingresar con Google. Intenta de nuevo o usa tu correo |
| `RATE_LIMITED` | Hiciste muchos intentos seguidos. Espera unos minutos e intenta de nuevo |
| Celular vacío | Escribe tu celular |
| Celular sin 10 dígitos | El celular debe tener 10 dígitos, sin el +57 |
| Celular que no empieza por 3 | Escribe un número de celular: en Colombia empiezan por 3 |
| Sin la autorización de datos (`CONSENT_REQUIRED`) | Sin esta autorización no podemos crear tu cuenta |
| Nombre vacío | Escribe tu nombre |

### Reserva (F4)

Los textos de la tabla de arriba (paso de horario, hora tomada, política, aprobación, éxito) se usan tal cual. Además:

| Lugar | Texto |
|---|---|
| Inicio | Nombre, "Barbería en Girardot" y la frase del dueño (**[PENDIENTE]**). Secciones "Servicios" (cada fila se despliega con la descripción, "Próximas horas" y "Ver todas las horas"; con varios barberos, "Reservar este servicio"), "El barbero", "Ubicación", "Horario" y "Contacto". Con una cita próxima: "Tu próxima cita" con fecha, hora, servicio y estado |
| Paso "Servicio" | "¿Qué servicio quieres?". Sin servicios: "Todavía no hay servicios para reservar" |
| Paso "Barbero" | "¿Con quién?". Primera fila "Cualquiera disponible", con "El que esté libre a la hora que elijas" |
| Horario sin hora elegida | La barra inferior dice "Elige una hora" y "Continuar" está apagado |
| Día sin horas | "El viernes 21 de noviembre no tiene horas libres." y "Ver la próxima hora libre". Sin días con horas: "No hay horas libres en los próximos días." |
| Hoy sin horas | "Hoy no hay horas. Te mostramos el viernes 21 de noviembre" |
| "Confirmar" sin sesión | "Para reservar, ingresa", "Con tu cuenta te avisamos de tu cita y puedes cambiarla o cancelarla. Vuelves aquí con la misma hora.", "Continuar con Google" (si está activo) y "Usar mi correo" |
| "Confirmar" con cuenta del personal | "Estás con una cuenta del personal. Las citas de los clientes se crean desde el panel; para reservar como cliente, usa otra cuenta." y "Ir al panel" |
| "Confirmar" con perfil incompleto | "Completa tu perfil para reservar." y "Completar mi perfil" |
| Resumen | Servicio, fecha larga, rango de horas, "Con [barbero]" ("Con el barbero que esté libre a esa hora" con "Cualquiera disponible"), "Total" y "Dónde" (**[PENDIENTE]** mientras falten precio y dirección) |
| Botón mientras reserva | "Reservando..." |
| "Listo" con aprobación | Título "Tu reserva quedó pendiente" y "Tu reserva queda pendiente de que el barbero la apruebe" |
| "Listo" | "Agregar al calendario", "Instalar la app" (si no está instalada) y "Volver al inicio". "Te llega un WhatsApp para confirmar un día antes." solo si el cliente lo aceptó y Meta está conectado (F7) |
| Instalar en iPhone | Hoja "Instala la app en tu iPhone": tocar Compartir, "Agregar a inicio" y "Agregar" |

### Mis citas (F5)

Los textos de la tabla de arriba (fuera de la ventana de 2 h, hora tomada, aprobación) se usan tal cual. Además:

| Lugar | Texto |
|---|---|
| Inicio con sesión de cliente | "Mis citas" y "Tu perfil" arriba. La tarjeta "Tu próxima cita" termina en "Ver, cambiar o cancelar" |
| Lista | Título "Mis citas". Secciones "Próxima cita", "También tienes" y "Citas pasadas". Solo con pasadas: "No tienes citas próximas." y "Reservar". Sin ninguna: "Todavía no tienes citas" y "Reservar". "Ver todas las citas pasadas" cuando hay más de 10 |
| Tarjeta de una cita próxima | El resumen de "Confirmar", el estado y "Puedes cancelarla o cambiarla hasta el vie 20 nov a las 1:00 p. m." (la hora sale de `cancel_window_min`; a la una, "a la 1:00"). "Cambiar hora", "Cancelar" y "Agregar al calendario". Pendiente de aprobación: "Tu reserva queda pendiente de que el barbero la apruebe" |
| Pasado el límite | "Ya no puedes cambiarla desde aquí. Escríbele al barbero" con el botón "Escríbele al barbero" (su WhatsApp). Si el barbero no tiene WhatsApp: "Ya no puedes cambiarla desde aquí." y "Escríbele por Instagram" |
| Cancelar | Hoja "¿Cancelar tu cita del jue 20 nov a las 3:00 p. m.?", "La hora queda libre para otros clientes.", "Sí, cancelar" (rojo, "Cancelando...") y "No". Después, arriba: "Cancelaste tu cita" |
| Historial | Por cita: servicio, fecha y hora, estado y "Volver a reservar" (si el servicio sigue activo). Una cita que ya pasó y el barbero no marcó dice "Pasada" |
| Página de una cita | Atrás "Mis citas", título "Tu cita" y la tarjeta. Después de cambiar la hora, arriba: "Cambiamos tu cita" |
| Cambiar hora, paso 1 | "Paso 1 de 2 · Nueva hora", "[servicio] · 60 min · Con [barbero]", título "Elige la nueva hora", "Tu cita ahora: jue 20 nov, 3:00 p. m." y el selector de F4 |
| Cambiar hora, paso 2 | "Paso 2 de 2 · Confirmar", título "Revisa el cambio", "Antes: jue 20 nov, 3:00 p. m.", el resumen con la hora nueva, "Tu cita de antes se cancela y la hora queda libre para otros clientes.", botón "Cambiar la hora" ("Cambiando..."). Si la hora se ocupó: vuelve al paso 1 con "Esa hora se acaba de ocupar, elige otra" |

### Panel (F6)

Pantallas del barbero y del administrador. Los avisos de éxito salen arriba (`toast`); los errores, junto a la acción o en la barra inferior.

| Lugar | Texto |
|---|---|
| Pestañas | "Hoy", "Semana", "Clientes" y "Más". Solo en esas cuatro pantallas; las de una tarea tienen atrás y su barra con la acción |
| Hoy | "Hoy · jue 20 nov" (otro día: "vie 21 nov" y "Hoy" para volver), botón "Cita", resumen "6 citas · 1 sin confirmar · 1 por cerrar · 1 por aprobar". Filas "Libre" (crea una cita a esa hora), "Bloqueado" con el motivo o "Todo el día", y la línea amarilla "Ahora". Sin horario ni citas: "Este día no tiene horario de atención ni citas. Puedes cambiar el horario en Más." |
| Administrador con varios barberos o sin agenda | Selector "Agenda de" con los barberos ("(inactivo)" si lo está). Sin barberos: "Todavía no hay barberos" y "Crear un barbero" |
| Por cerrar y pendientes | "Por cerrar (n)" con "Vino" y "No vino"; las atendidas sin cobro dicen "Falta registrar el cobro" con "Registrar cobro". "Pendientes de aprobar (n)" con "Aprobar" y "Rechazar" |
| Hoja de la cita | Nombre del cliente, servicio, fecha y hora; "WhatsApp" (o "Este cliente no tiene celular registrado."), "Fecha y hora", "Servicio", "Estado", "Valor de la reserva", "Origen" ("La reservó el cliente" o "La creó el personal"), "WhatsApp al cliente" (F7), "Notas sobre el cliente" ("Sin notas."). Acciones "Aprobar", "Rechazar", "No vino", "Mover" y "Cancelar" según el estado |
| Cancelar desde la hoja | "¿Cancelar esta cita? La hora queda libre para otros clientes.", campo "Motivo", "Sí, cancelar la cita" (rojo) y "No, volver" |
| Avisos | "Creaste la cita", "Moviste la cita", "Cancelaste la cita", "Aprobaste la reserva", "Rechazaste la reserva", "Marcaste que no vino", "Guardaste el cobro", "Corregiste el cobro", "Anulaste el cobro", "Reiniciaste las inasistencias" |
| Hoja de cobro | Título "Cobro", "[cliente] · [servicio]", "Valor cobrado" con "$" (prellenado con el precio de la cita; sin precio: "El servicio no tiene precio definido: escribe lo que se cobró."), "Para ti (50 %)" o "Para el barbero (50 %)" y "Para la barbería (50 %)" en vivo, "Guardar cobro" ("Guardando...") y "Volver". Sin valor: "Escribe el valor cobrado". Sin porcentaje: "Falta definir el porcentaje de este barbero" |
| Cobro en la hoja de la cita | "Cobro" con el valor y "Barbero $... (50 %) · Barbería $...", "Corregir valor" (el barbero, solo hoy; el administrador, siempre) y "Anular cobro" (administrador). Anulado: tachado y "Anulado: [motivo]" |
| Cobro registrado a medias | "La cita quedó como atendida, pero falta registrar el cobro. Intenta de nuevo desde Por cerrar: [error]" |
| Anular un cobro | Hoja "Anular cobro": "¿Anular este cobro? Deja de contar en la liquidación, pero no se borra.", "Motivo", "Sí, anular el cobro" (rojo) y "Volver" |
| Liquidación | Periodos "Hoy", "Esta semana", "Esta quincena", "Este mes" y "Rango" ("Desde", "Hasta", "Ver el rango"). Administrador: "Liquidación de" con "Toda la barbería" y cada barbero. "Total cobrado", "Para ti (50 % hoy)" o "Para el barbero", "Para la barbería", "n servicios", "Cada cobro guarda el porcentaje que había ese día: cambiarlo no cambia los periodos anteriores. Los anulados no cuentan." Lista "Cobros" (vacía: "No hay cobros en este periodo."). Un barbero que abre un cobro de otro día: "Solo puedes corregir los cobros del mismo día." |
| Ficha del cliente | "WhatsApp", "Celular", "Cuenta" ("Tiene cuenta en la app" o "Sin cuenta (lo registró el personal)"), "Recordatorios por WhatsApp", "Autorización de datos" ("Desde el ..." o "Sin autorización registrada"), "Inasistencias" con "Necesita aprobación", "Reiniciar inasistencias" (administrador). "Notas" ("Sin notas."), "Nota nueva" ("Privada: el cliente no la ve."), "Guardar nota", "Borrar". "Historial" ("Sin citas.") |
| Porcentajes (administrador) | "La parte de cada servicio que es para el barbero; el resto es para la barbería. Cambiarlo vale para los cobros nuevos: los que ya están guardados conservan el porcentaje de su día." Campo "Porcentaje de [barbero]" ("Sin porcentaje no se pueden registrar sus cobros."), "Guardar", "Guardaste el porcentaje". Error: "Escribe un porcentaje de 0 a 100" |
| Configuración (administrador) | "Agenda": "Anticipación mínima, en minutos", "Días hacia adelante", "Cancelar o cambiar hasta, en minutos antes", "Inasistencias para pedir aprobación", "Guardar la agenda", "Guardaste las reglas de la agenda". "Recordatorios": "Los recordatorios por WhatsApp empiezan a salir cuando se active la conexión con Meta. Mientras tanto, esto solo queda guardado.", "Primer recordatorio, horas antes", "Segundo recordatorio, horas antes" ("Vacío para mandar solo uno."), "Mandar la confirmación apenas se reserva", "Avisar al cliente cuando el personal cancela su cita" ("Actívalo cuando Meta apruebe la plantilla cita_cancelada.", F7), "Guardar los recordatorios". Con Meta conectado, el texto de arriba pasa a "Salen por WhatsApp a los clientes que lo aceptaron. Un cambio aplica a las citas que se reserven después." |
| Roles (administrador) | "Personal" ("Toca un rol para quitarlo.", "(tú)", "Perfil: [barbero]") con un botón por rol. "Dar un rol": "Correo de la cuenta" ("La persona primero se registra en la app con ese correo."), "Barbero" o "Administrador", "Perfil de barbero" ("No hay perfiles sin cuenta. Créalo primero en Barberos."), "Dar el rol", "Diste el rol", "Quitaste el rol de [rol]" |
| Errores de roles | `USER_NOT_FOUND` "No hay una cuenta con ese correo. Pídele que se registre primero"; `CANNOT_REVOKE_SELF` "No puedes quitarte a ti mismo el rol de administrador"; "Elige el perfil de barbero de esta cuenta"; `ALREADY_LINKED` "Esa cuenta ya tiene otro perfil de barbero" |
| Nueva cita | Título "Nueva cita" ("Con [barbero]" si hay varios). "Cliente": "Buscar" o "Cliente nuevo"; "Buscar por nombre o celular"; sin resultados "No encontramos clientes con ese nombre o celular. Créalo como cliente nuevo." Cliente nuevo: "Nombre", "Celular" (ayuda "Para los recordatorios por WhatsApp. Ningún otro cliente lo ve."), "El cliente autorizó de palabra el tratamiento de sus datos para agendar sus citas, según la política de tratamiento de datos." (obligatoria) y "Quiere recibir por WhatsApp la confirmación y los recordatorios de sus citas." "Servicio". "Fecha y hora": "Fecha", "Horas libres", "Hora" (ayuda "Elige una hora libre o escribe otra."). Botón "Crear cita" ("Creando...") |
| Errores de Nueva cita | "Elige un cliente o crea uno nuevo", "Escribe el nombre del cliente", "Escribe el celular del cliente", "Sin la autorización del cliente no podemos guardar sus datos", "Elige el servicio", "Elige la fecha y la hora" |
| Mover | Título "Mover cita", el cliente con "ahora el ...", la misma elección de fecha y hora y "Mover la cita" ("Moviendo...") |
| Semana | "Semana", "lun 16 nov a dom 22 nov", por día "3 citas · 5 libres", "Sin horario" o "Bloqueado", y la barra de ocupación |
| Clientes | "Buscar por nombre o celular", "1 inasistencia" o "2 inasistencias", "Necesita aprobación", "Todavía no tienes clientes." |
| Más | Secciones "Avisos" (F8, solo quien es barbero), "Cobros" ("Liquidación"), "Agenda" ("Horario semanal", "Bloqueos") y, solo para el administrador, "Administración" ("Servicios", "Barberos", "Porcentajes", "Configuración", "Roles"). "Cerrar sesión". Desde F7, "WhatsApp" (solo el administrador): "Noviembre 2026: unos $1.170", "390 mensajes entregados · 2 fallaron", la tarifa usada y, si Meta cobró alguno como marketing, el aviso para revisar las plantillas. Sin Meta conectado: "Los recordatorios todavía no salen: falta conectar el número con Meta." |
| Horario semanal | "Las horas que ven los clientes salen de aquí. Para el almuerzo, usa dos rangos. Las citas que ya existen no cambian." Por día: "Cerrado", "Agregar rango", "Igual que el [día anterior]". Errores junto al día: "Cada rango debe terminar después de empezar", "Dos rangos de este día se cruzan". Botón "Guardar horario"; después, "Guardaste el horario" |
| Bloqueos | "Nuevo bloqueo", con la nota "Lo que se repite cada semana, como el almuerzo, va en el Horario semanal con dos rangos por día. Los bloqueos son para fechas puntuales: vacaciones, una diligencia o un festivo." ("Horario semanal" es un enlace). "Todo el día" va primero; sin marcar, cada fecha lleva su hora al lado: "Desde" con "Hora de inicio" y "Hasta" con "Hora de fin". Con fechas distintas y horas: "Con fechas distintas, el bloqueo va de corrido: empieza el primer día a la hora de inicio y termina el último día a la hora de fin. Para unas horas todos los días, usa el Horario semanal." (20/11/2026: el dueño probó el almuerzo como bloqueo "del 21 de noviembre a 2030, de 1 a 2" esperando que se repitiera cada día, y le salió de corrido; antes las dos fechas iban en una fila y las dos horas debajo, y el ejemplo del motivo decía "Almuerzo". Ahora dice "Vacaciones, diligencia..."). "Motivo" (ayuda "Opcional. Solo lo ve el personal."), "Bloquear". Con citas debajo: "Bloqueaste ese horario, pero hay 1 cita debajo. Muévelas o cancélalas:" y un enlace por cita; sin citas: "Bloqueaste ese horario. No había citas." "Próximos bloqueos" con "Borrar" ("No tienes bloqueos."). "Festivos": "Festivos de Colombia de los próximos meses. Bloquea los que no vas a atender." con "Bloquear" o "Bloqueado"; el motivo queda "Festivo: [nombre]" |
| Servicios (administrador) | "Los clientes los ven en este orden. Un servicio sin precio dice [PENDIENTE]." Filas con duración, precio o [PENDIENTE] e "Inactivo"; "Subir" y "Bajar". Formulario: "Nombre", "Duración en minutos" ("En múltiplos de 5."), "Precio en pesos" ("Déjalo vacío si todavía no está definido: los clientes verán [PENDIENTE]."), "Descripción", "Activo" ("Si lo desactivas, los clientes ya no lo pueden reservar. Las citas que existen no cambian."), "Crear servicio" o "Guardar" |
| Barberos (administrador) | Lista con "Activo" o "Inactivo" y "con cuenta" o "sin cuenta". Nuevo: "Nombre visible" y "Porcentaje para el barbero" ("Del valor de cada servicio. El resto es para la barbería."). Perfil: "Foto" ("Subir una foto" o "Cambiar la foto"), "Portafolio" ("Agregar una foto", "Quitar"), "Presentación", "WhatsApp", "Intervalo de las horas", "Servicios que hace", "Activo". Error de imagen: "No pudimos leer esa imagen. Usa una foto JPG o PNG." |

### PWA y avisos (F8)

| Lugar | Texto |
|---|---|
| Aviso arriba, sin conexión (en cualquier pantalla) | "Sin conexión. Para reservar, cambiar o cancelar necesitas conexión." Aviso de estado (`role="status"`): queda mientras no haya red y no roba el foco |
| Aviso arriba, versión nueva | "Hay una versión nueva." con "Actualizar" ("Actualizando..."), que recarga con la versión nueva. Si se ignora, la versión nueva entra la próxima vez que se abra la app |
| Pantalla sin conexión | Título "Sin conexión", "No pudimos cargar esta página. Revisa tu conexión e intenta de nuevo.", "Para ver las horas libres, reservar, cambiar o cancelar necesitas conexión. Tus citas se pueden ver sin conexión en Mis citas si ya las abriste en este celular." Botones "Intentar de nuevo" y "Ver mis citas" |
| Error de una acción (límite de error) | Con red: "Algo salió mal" y "No pudimos completar la acción. Intenta de nuevo." Sin red: "Sin conexión" y "No pudimos completar la acción. Para reservar, cambiar o cancelar necesitas conexión." Botón "Intentar de nuevo" |
| Cancelar sin conexión (hoja) | "Sin conexión. Para cancelar tu cita necesitas conexión" |
| Mis citas, al final | "Instala la app para abrir tus citas con un toque, aun sin señal." e "Instalar la app" (solo si no está instalada: en Android el aviso del navegador, en iPhone la hoja de F4). Nunca al entrar a la app |
| Más, sección "Avisos" (solo quien es barbero, arriba de todo) | "Te avisamos en este celular cuando un cliente reserve, cambie, confirme o cancele una cita." y "Activar avisos" ("Activando..."). El permiso del navegador se pide solo al tocar el botón. Activos: "Los avisos están activos en este celular.", "Enviar un aviso de prueba" y "Desactivar avisos". Avisos arriba: "Activaste los avisos en este celular", "Desactivaste los avisos en este celular", "Te enviamos un aviso de prueba" |
| Avisos, otros estados | Bloqueados: "Bloqueaste los avisos de Possos Barber. Para recibirlos, permítelos en los ajustes del navegador o del celular." iPhone sin instalar: "En el iPhone, los avisos solo llegan con la app instalada. En Safari toca Compartir, luego "Agregar a inicio", y abre Possos Barber desde su ícono." Sin soporte: "Este navegador no puede recibir avisos. En Android usa Chrome; en iPhone, instala la app." Sin claves: "Los avisos todavía no están configurados en la app." |
| Errores de avisos | "No pudimos activar los avisos. Intenta de nuevo", "Sin conexión. Para activar los avisos necesitas conexión", "No pudimos desactivar los avisos. Intenta de nuevo", "No pudimos enviar el aviso. Revisa tu conexión e intenta de nuevo", "Este celular ya no recibe avisos. Desactívalos y vuelve a activarlos", "Los avisos son para la cuenta de un barbero" |
| Push al barbero (título y cuerpo) | "Nueva reserva", "Reserva por aprobar", "Cita cambiada" (el cuerpo dice "ahora el ..."), "Cambio por aprobar", "Cita cancelada", "Cita confirmada". Cuerpo: "[cliente] · [servicio] · vie 20 nov, 3:00 p. m.". Nunca el celular del cliente. Tocarlo abre la cita en "Hoy", en su día (`/panel?dia=...&cita=...`). Solo avisa lo que hizo el cliente, no lo que hizo el personal. Aviso de prueba: "Avisos activos" y "Así te avisamos cuando un cliente reserve, cambie, confirme o cancele una cita." |
| App instalada | Nombre "Possos Barber" (corto "Possos"), monograma sobre `#0B0B0B`, a pantalla completa. En iPhone, barra de estado negra (no translúcida): ninguna pantalla queda debajo de la isla |

## Beunik: lo que muestran las capturas del dueño

El dueño compartió dos capturas del inicio de Beunik PRO desde su cuenta (recibidas el 19/11/2026). No se guardan en el repo porque muestran su correo y un anuncio de terceros; aquí se describen.

**Captura 1, parte superior del inicio:**

- Etiqueta "Plan: Básico - Individual". El nombre no coincide con los planes publicados en beunik.co (Plata y Oro, ver [01](01-beunik.md)).
- Saludo con el nombre, el rol "Administrador", el correo y el negocio.
- Cuatro métricas: **102** seguidores del negocio, **1.276** agendamientos, **5,0** de calificación con **161** reseñas y **652** facturas.
- Un anuncio grande de un seminario de barbería en Bogotá, de terceros, que ocupa cerca de un tercio de la pantalla.
- Una tarjeta "!Te quedaste sin mensajes! Recuerda que las citas no serán recordadas." con el botón "Comprar mensajes" (con el signo de apertura equivocado). Confirma el problema que motiva el proyecto ([03](03-recordatorios-whatsapp.md)).
- La agenda no se ve sin desplazarse: "Mi Negocio" empieza al final de la primera pantalla.

**Captura 2, menú:**

- "Mi Negocio": Agenda, Servicios, Productos, Informes, Gastos, Facturas, Historial de pagos y Desafíos (con un aviso rojo).
- "Marketing y ventas": Promociones, Combos, Muestras de trabajo, Clientes, Estadísticas y Campañas WhatsApp.
- "Red Profesional", con un ícono de birrete.
- Son 15 entradas o más con el mismo peso visual. La Agenda, que se usa todos los días, pesa lo mismo que Desafíos.

**Qué se aprende:**

| En Beunik | En Possos Barber |
|---|---|
| El inicio es un perfil con métricas y un menú | El inicio es la agenda de hoy ([Hoy](#hoy-inicio-del-panel)) |
| Seguidores y desafíos | Fuera. Son del marketplace y no ayudan a cortar más |
| Anuncios de terceros | Nunca |
| "Te quedaste sin mensajes", con venta | Sin paquetes que se acaben. En "Más" se muestra el costo de WhatsApp del mes, como información |
| 15 accesos al mismo nivel | Cuatro pestañas (Hoy, Semana, Clientes, Más). Lo poco frecuente va en "Más" |
| 1.276 agendamientos históricos | Sirve para estimar volumen. Con un barbero, es consistente con la estimación de [03](03-recordatorios-whatsapp.md) |
| 161 reseñas con 5,0 | Es un activo del negocio que se queda en Beunik. Hay que preguntar si se pueden exportar o enlazar ([10](10-riesgos-decisiones-abiertas.md)) |
| 652 facturas | El dueño aclaró (19/11/2026) que solo reparten el valor de cada servicio entre el barbero y la barbería con un porcentaje. Entra en el MVP como "Cobros" y "Liquidación" ([abajo](#cobro-al-marcar-vino)). No se llama "factura" para no confundirla con la factura electrónica de la DIAN |
| Productos, Combos, Promociones | Productos y combos: fase 3. Promociones: fuera de los recordatorios, por la regla de plantillas de utilidad |

Sigue pendiente ver el flujo de reserva del lado del cliente en la app de Beunik, para que el sitio nuevo se le parezca donde convenga ([01](01-beunik.md)).

## Verificar al implementar

Revisado en F1 el 19/11/2026 ([fases/F1](../fases/F1-sistema-diseno.md#cierre-19112026)).

- [x] Contraste de cada combinación de tokens con una herramienta. Medido con culori en `packages/ui/src/internal/tokens.test.ts`; los valores coinciden con la tabla. axe-core revisa además el texto pintado en la página de muestras.
- [x] Que Geist tenga cifras tabulares activables con `tabular-nums` en la versión que se instale. Geist 1.9.2 trae `tnum`: todas las cifras pasan a medir 600 unidades.
- [x] Formato de hora en Safari de iOS y en Chrome de Android. Resuelto sin depender del motor: `Intl` solo convierte a la hora de Bogotá, y los nombres de días y meses y el "a. m." o "p. m." se escriben en el código, con espacio que no se parte ("3:00 p. m.").
- [ ] La tira de días con lector de pantalla (VoiceOver y TalkBack): cada día se anuncia completo, "jueves 20 de noviembre, 6 horas libres". El nombre accesible ya se prueba con Playwright; falta oírlo en celulares reales.
- [ ] El componente de hoja inferior de shadcn/ui (Drawer, sobre vaul) cierra con el gesto atrás de Android. Implementado con una entrada en el historial y probado con el botón atrás en Chromium; falta el gesto en un Android real.
- [ ] La barra inferior fija con el teclado abierto en iOS. Falta probarla en un iPhone.
