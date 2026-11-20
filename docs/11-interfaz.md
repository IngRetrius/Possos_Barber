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
| Carga | NN/g (*Skeleton Screens*): los esqueletos indican la estructura mientras carga; no reemplazan la optimización | Esqueleto de la cuadrícula de horas al cambiar de día. Si la respuesta tarda menos de 300 ms, no se muestra nada |
| Tamaño táctil | WCAG 2.2, criterio 2.5.8 (AA): 24 × 24 px como mínimo. Apple: 44 × 44 pt. Material: 48 × 48 dp | Mínimo de diseño: 48 px de alto para horas, filas y botones; 44 px para íconos sueltos (con área táctil ampliada) |
| Modo oscuro | NN/g: la gente elige el modo en el sistema, no en cada app. El contraste excesivo produce halo al leer; hay que cuidar que el foco del teclado se vea | Solo modo oscuro en el MVP (decisión de marca). Texto `#F5F5F5` en vez de blanco puro y fondo `#0B0B0B` en vez de negro puro. Anillo de foco amarillo de 2 px |

## Sistema visual

### Color

Decisión del 19/11/2026: monocromo más un acento. El gris del logo, medido en el archivo, es `#BCBCBC` sobre `#000000`. Contrastes calculados con la fórmula de WCAG 2.2 y medidos con culori en F1 (coinciden). Los valores viven en `packages/ui/src/styles.css`; una prueba verifica que sean los de esta tabla.

| Token | Valor | Contraste sobre `--bg` | Uso |
|---|---|---|---|
| `--bg` | `#0B0B0B` | | Fondo de la app |
| `--surface` | `#151515` | | Tarjetas y filas |
| `--surface-2` | `#1F1F1F` | | Hojas inferiores, elemento presionado |
| `--border` | `#262626` | 1,3 (decorativo) | Divisiones entre filas y tarjetas |
| `--border-strong` | `#6B6B6B` | 3,7 (3,1 sobre `--surface-2`) | Bordes de campos y de horas libres: cumplen 3:1 para componentes |
| `--fg` | `#F5F5F5` | 18,1 | Texto principal |
| `--fg-muted` | `#A1A1A1` | 7,6 | Texto secundario: duración, etiquetas |
| `--fg-subtle` | `#8A8A8A` | 5,7 (4,8 sobre `--surface-2`) | Texto terciario, deshabilitado con etiqueta |
| `--brand` | `#BCBCBC` | 10,4 | El gris del logo. Logo, nombre del negocio |
| `--accent` | `#F2F824` | 17,1 | Botón principal, hora elegida, anillo de foco, línea de "ahora" en la agenda |
| `--accent-fg` | `#0B0B0B` | 17,1 sobre el acento | Texto sobre el amarillo |
| `--success` | `#00F818` | 13,5 | Solo el estado "Confirmada" (punto y texto) |
| `--warning` | `#F5A524` | 9,6 | "Sin confirmar", "Pendiente de aprobación", "Por cerrar" |
| `--danger` | `#FF6B6B` | 7,1 | Errores, "Cancelar cita", "No vino" |

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
- Respeta las zonas seguras del iPhone con la PWA instalada: `padding-bottom: env(safe-area-inset-bottom)` en la barra inferior y `viewport-fit=cover`.
- Íconos: Lucide (viene con shadcn/ui), trazo de 1,5, 20 px, siempre con etiqueta en la navegación.
- Movimiento: 150 a 200 ms con *ease-out* para entrar, sin rebotes. Con `prefers-reduced-motion: reduce`, solo cambios de opacidad.

### Logo

- Archivo actual: [marca/logo-possos-negro.png](marca/logo-possos-negro.png), 1490 × 1600 px, gris `#BCBCBC` sobre negro puro. Es un PNG; hace falta el **vector (SVG)** para que se vea nítido en cualquier tamaño ([10](10-riesgos-decisiones-abiertas.md), decisión 11).
- Mientras llega el SVG, se recorta el monograma, se quita el fondo y se exporta a 1x, 2x y 3x (hecho en F1: `packages/ui/src/assets/`; íconos de la PWA en `apps/web/public/icons/`).
- Usos: encabezado de la página pública (28 px de alto), ícono de la PWA (monograma centrado sobre `#0B0B0B`, con margen para la versión *maskable*) y pantalla de inicio de la PWA.

## Pantallas del cliente

Todas se diseñan a 390 px de ancho. Los horarios y precios de los bocetos son ejemplos; los reales están **[PENDIENTE]**.

### Inicio público

```
┌──────────────────────────────────┐
│ [P]  Possos Barber      Ingresar │
│                                  │
│ Barbería en Girardot             │
│ [PENDIENTE: frase del dueño]     │
│                                  │
│ Servicios                        │
│ ┌──────────────────────────────┐ │
│ │ Corte              $25.000 ˄ │ │  abierta
│ │ 60 min                       │ │
│ │ Servicio de corte que…       │ │
│ │ [ Reservar este servicio ]   │ │
│ ├──────────────────────────────┤ │
│ │ Corte con barba    $40.000 ˅ │ │
│ │ 2 h                          │ │
│ └──────────────────────────────┘ │
│ El barbero · foto y portafolio   │
│ Ubicación · mapa · horario       │
│ Instagram · WhatsApp             │
├──────────────────────────────────┤
│ [          Reservar          ]   │  barra fija, botón amarillo
└──────────────────────────────────┘
```

- Si el cliente ya tiene una cita próxima, la primera tarjeta es esa cita ("Tu cita: jue 20 nov, 3:00 p. m.") en vez de la frase.
- La página se renderiza en el servidor para búsquedas locales ([05](05-alcance.md)).
- Cada servicio es una fila que se despliega en el sitio (acordeón con `<details>`; abrir una cierra la otra): muestra la descripción completa y "Reservar este servicio" (botón secundario, porque el amarillo ya está en la barra fija), que abre el flujo con ese servicio elegido. No es hoja inferior (principio 6) y funciona sin JavaScript. Pedido de Juan el 19/11/2026: la descripción cortada no se leía y desde el inicio no se podía reservar un servicio concreto.

### Paso: Servicio

Solo aparece si hay más de un servicio activo. Lista de filas de 64 px: nombre, duración y precio. La duración va en minutos hasta 60 ("45 min", "60 min") y en horas desde ahí ("2 h", "1 h 30 min"), en todas las pantallas. Tocar una fila avanza; no hay botón "Continuar" en este paso.

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
│ │ Total en la barbería  [PEND] │ │
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
- Botones secundarios: "Agregar al calendario" (.ics) y, si la app no está instalada, "Instalar la app" con la guía de iOS.

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
- Estado del recordatorio: "Recordatorio entregado" o "El recordatorio falló: revisa el número".
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

### Más

- Liquidación, horario semanal, bloqueos, servicios, barberos y porcentajes (admin), configuración de la agenda y de los recordatorios, costo de WhatsApp del mes.

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
| Inicio | Nombre, "Barbería en Girardot" y la frase del dueño (**[PENDIENTE]**). Secciones "Servicios" (cada fila se despliega con la descripción y "Reservar este servicio"), "El barbero", "Ubicación", "Horario" y "Contacto". Con una cita próxima: "Tu próxima cita" con fecha, hora, servicio y estado |
| Paso "Servicio" | "¿Qué servicio quieres?". Sin servicios: "Todavía no hay servicios para reservar" |
| Paso "Barbero" | "¿Con quién?". Primera fila "Cualquiera disponible", con "El que esté libre a la hora que elijas" |
| Horario sin hora elegida | La barra inferior dice "Elige una hora" y "Continuar" está apagado |
| Día sin horas | "El viernes 21 de noviembre no tiene horas libres." y "Ver la próxima hora libre". Sin días con horas: "No hay horas libres en los próximos días." |
| Hoy sin horas | "Hoy no hay horas. Te mostramos el viernes 21 de noviembre" |
| "Confirmar" sin sesión | "Para reservar, ingresa", "Con tu cuenta te avisamos de tu cita y puedes cambiarla o cancelarla. Vuelves aquí con la misma hora.", "Continuar con Google" (si está activo) y "Usar mi correo" |
| "Confirmar" con cuenta del personal | "Estás con una cuenta del personal. Las citas de los clientes se crean desde el panel; para reservar como cliente, usa otra cuenta." y "Ir al panel" |
| "Confirmar" con perfil incompleto | "Completa tu perfil para reservar." y "Completar mi perfil" |
| Resumen | Servicio, fecha larga, rango de horas, "Con [barbero]" ("Con el barbero que esté libre a esa hora" con "Cualquiera disponible"), "Total en la barbería" y "Dónde" (**[PENDIENTE]** mientras falten precio y dirección) |
| Botón mientras reserva | "Reservando..." |
| "Listo" con aprobación | Título "Tu reserva quedó pendiente" y "Tu reserva queda pendiente de que el barbero la apruebe" |
| "Listo" | "Agregar al calendario", "Instalar la app" (si no está instalada) y "Volver al inicio". El aviso del WhatsApp se activa en F7 |
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
| Hoja de la cita | Nombre del cliente, servicio, fecha y hora; "WhatsApp" (o "Este cliente no tiene celular registrado."), "Fecha y hora", "Servicio", "Estado", "Valor de la reserva", "Origen" ("La reservó el cliente" o "La creó el personal"), "Notas sobre el cliente" ("Sin notas."). Acciones "Aprobar", "Rechazar", "No vino", "Mover" y "Cancelar" según el estado |
| Cancelar desde la hoja | "¿Cancelar esta cita? La hora queda libre para otros clientes.", campo "Motivo", "Sí, cancelar la cita" (rojo) y "No, volver" |
| Avisos | "Creaste la cita", "Moviste la cita", "Cancelaste la cita", "Aprobaste la reserva", "Rechazaste la reserva", "Marcaste que no vino", "Guardaste el cobro", "Corregiste el cobro", "Anulaste el cobro", "Reiniciaste las inasistencias" |
| Hoja de cobro | Título "Cobro", "[cliente] · [servicio]", "Valor cobrado" con "$" (prellenado con el precio de la cita; sin precio: "El servicio no tiene precio definido: escribe lo que se cobró."), "Para ti (50 %)" o "Para el barbero (50 %)" y "Para la barbería (50 %)" en vivo, "Guardar cobro" ("Guardando...") y "Volver". Sin valor: "Escribe el valor cobrado". Sin porcentaje: "Falta definir el porcentaje de este barbero" |
| Cobro en la hoja de la cita | "Cobro" con el valor y "Barbero $... (50 %) · Barbería $...", "Corregir valor" (el barbero, solo hoy; el administrador, siempre) y "Anular cobro" (administrador). Anulado: tachado y "Anulado: [motivo]" |
| Cobro registrado a medias | "La cita quedó como atendida, pero falta registrar el cobro. Intenta de nuevo desde Por cerrar: [error]" |
| Anular un cobro | Hoja "Anular cobro": "¿Anular este cobro? Deja de contar en la liquidación, pero no se borra.", "Motivo", "Sí, anular el cobro" (rojo) y "Volver" |
| Liquidación | Periodos "Hoy", "Esta semana", "Esta quincena", "Este mes" y "Rango" ("Desde", "Hasta", "Ver el rango"). Administrador: "Liquidación de" con "Toda la barbería" y cada barbero. "Total cobrado", "Para ti (50 % hoy)" o "Para el barbero", "Para la barbería", "n servicios", "Cada cobro guarda el porcentaje que había ese día: cambiarlo no cambia los periodos anteriores. Los anulados no cuentan." Lista "Cobros" (vacía: "No hay cobros en este periodo."). Un barbero que abre un cobro de otro día: "Solo puedes corregir los cobros del mismo día." |
| Ficha del cliente | "WhatsApp", "Celular", "Cuenta" ("Tiene cuenta en la app" o "Sin cuenta (lo registró el personal)"), "Recordatorios por WhatsApp", "Autorización de datos" ("Desde el ..." o "Sin autorización registrada"), "Inasistencias" con "Necesita aprobación", "Reiniciar inasistencias" (administrador). "Notas" ("Sin notas."), "Nota nueva" ("Privada: el cliente no la ve."), "Guardar nota", "Borrar". "Historial" ("Sin citas.") |
| Porcentajes (administrador) | "La parte de cada servicio que es para el barbero; el resto es para la barbería. Cambiarlo vale para los cobros nuevos: los que ya están guardados conservan el porcentaje de su día." Campo "Porcentaje de [barbero]" ("Sin porcentaje no se pueden registrar sus cobros."), "Guardar", "Guardaste el porcentaje". Error: "Escribe un porcentaje de 0 a 100" |
| Configuración (administrador) | "Agenda": "Anticipación mínima, en minutos", "Días hacia adelante", "Cancelar o cambiar hasta, en minutos antes", "Inasistencias para pedir aprobación", "Guardar la agenda", "Guardaste las reglas de la agenda". "Recordatorios": "Los recordatorios por WhatsApp empiezan a salir cuando se active la conexión con Meta. Mientras tanto, esto solo queda guardado.", "Primer recordatorio, horas antes", "Segundo recordatorio, horas antes" ("Vacío para mandar solo uno."), "Mandar la confirmación apenas se reserva", "Guardar los recordatorios" |
| Roles (administrador) | "Personal" ("Toca un rol para quitarlo.", "(tú)", "Perfil: [barbero]") con un botón por rol. "Dar un rol": "Correo de la cuenta" ("La persona primero se registra en la app con ese correo."), "Barbero" o "Administrador", "Perfil de barbero" ("No hay perfiles sin cuenta. Créalo primero en Barberos."), "Dar el rol", "Diste el rol", "Quitaste el rol de [rol]" |
| Errores de roles | `USER_NOT_FOUND` "No hay una cuenta con ese correo. Pídele que se registre primero"; `CANNOT_REVOKE_SELF` "No puedes quitarte a ti mismo el rol de administrador"; "Elige el perfil de barbero de esta cuenta"; `ALREADY_LINKED` "Esa cuenta ya tiene otro perfil de barbero" |
| Nueva cita | Título "Nueva cita" ("Con [barbero]" si hay varios). "Cliente": "Buscar" o "Cliente nuevo"; "Buscar por nombre o celular"; sin resultados "No encontramos clientes con ese nombre o celular. Créalo como cliente nuevo." Cliente nuevo: "Nombre", "Celular" (ayuda "Para los recordatorios por WhatsApp. Ningún otro cliente lo ve."), "El cliente autorizó de palabra el tratamiento de sus datos para agendar sus citas, según la política de tratamiento de datos." (obligatoria) y "Quiere recibir por WhatsApp la confirmación y los recordatorios de sus citas." "Servicio". "Fecha y hora": "Fecha", "Horas libres", "Hora" (ayuda "Elige una hora libre o escribe otra."). Botón "Crear cita" ("Creando...") |
| Errores de Nueva cita | "Elige un cliente o crea uno nuevo", "Escribe el nombre del cliente", "Escribe el celular del cliente", "Sin la autorización del cliente no podemos guardar sus datos", "Elige el servicio", "Elige la fecha y la hora" |
| Mover | Título "Mover cita", el cliente con "ahora el ...", la misma elección de fecha y hora y "Mover la cita" ("Moviendo...") |
| Semana | "Semana", "lun 16 nov a dom 22 nov", por día "3 citas · 5 libres", "Sin horario" o "Bloqueado", y la barra de ocupación |
| Clientes | "Buscar por nombre o celular", "1 inasistencia" o "2 inasistencias", "Necesita aprobación", "Todavía no tienes clientes." |
| Más | Secciones "Cobros" ("Liquidación"), "Agenda" ("Horario semanal", "Bloqueos") y, solo para el administrador, "Administración" ("Servicios", "Barberos", "Porcentajes", "Configuración", "Roles"). "Cerrar sesión". El costo de WhatsApp del mes llega con F7 |
| Horario semanal | "Las horas que ven los clientes salen de aquí. Para el almuerzo, usa dos rangos. Las citas que ya existen no cambian." Por día: "Cerrado", "Agregar rango", "Igual que el [día anterior]". Errores junto al día: "Cada rango debe terminar después de empezar", "Dos rangos de este día se cruzan". Botón "Guardar horario"; después, "Guardaste el horario" |
| Bloqueos | "Nuevo bloqueo": "Desde", "Hasta", "Todo el día", "Hora de inicio", "Hora de fin", "Motivo" (ayuda "Opcional. Solo lo ve el personal."), "Bloquear". Con citas debajo: "Bloqueaste ese horario, pero hay 1 cita debajo. Muévelas o cancélalas:" y un enlace por cita; sin citas: "Bloqueaste ese horario. No había citas." "Próximos bloqueos" con "Borrar" ("No tienes bloqueos."). "Festivos": "Festivos de Colombia de los próximos meses. Bloquea los que no vas a atender." con "Bloquear" o "Bloqueado"; el motivo queda "Festivo: [nombre]" |
| Servicios (administrador) | "Los clientes los ven en este orden. Un servicio sin precio dice [PENDIENTE]." Filas con duración, precio o [PENDIENTE] e "Inactivo"; "Subir" y "Bajar". Formulario: "Nombre", "Duración en minutos" ("En múltiplos de 5."), "Precio en pesos" ("Déjalo vacío si todavía no está definido: los clientes verán [PENDIENTE]."), "Descripción", "Activo" ("Si lo desactivas, los clientes ya no lo pueden reservar. Las citas que existen no cambian."), "Crear servicio" o "Guardar" |
| Barberos (administrador) | Lista con "Activo" o "Inactivo" y "con cuenta" o "sin cuenta". Nuevo: "Nombre visible" y "Porcentaje para el barbero" ("Del valor de cada servicio. El resto es para la barbería."). Perfil: "Foto" ("Subir una foto" o "Cambiar la foto"), "Portafolio" ("Agregar una foto", "Quitar"), "Presentación", "WhatsApp", "Intervalo de las horas", "Servicios que hace", "Activo". Error de imagen: "No pudimos leer esa imagen. Usa una foto JPG o PNG." |

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
