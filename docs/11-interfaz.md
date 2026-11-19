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

Decisión del 19/11/2026: monocromo más un acento. El gris del logo, medido en el archivo, es `#BCBCBC` sobre `#000000`. Contrastes calculados con la fórmula de WCAG 2.2.

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
- Mientras llega el SVG, se recorta el monograma, se quita el fondo y se exporta a 2x y 3x.
- Usos: encabezado de la página pública (28 px de alto), ícono de la PWA (monograma centrado sobre `#0B0B0B`, con margen para la versión *maskable*) y pantalla de inicio de la PWA.

## Pantallas del cliente

Todas se diseñan a 390 px de ancho. Los horarios y precios de los bocetos son ejemplos; los reales están **[PENDIENTE]**.

### Inicio público

```
┌──────────────────────────────────┐
│ [P]  Possos Barber      Ingresar │
│                                  │
│ Barbería en Ibagué               │
│ [PENDIENTE: frase del dueño]     │
│                                  │
│ Servicios                        │
│ ┌──────────────────────────────┐ │
│ │ Corte normal          60 min │ │
│ │                [PENDIENTE] $ │ │
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

### Paso: Servicio

Solo aparece si hay más de un servicio activo. Lista de filas de 64 px: nombre, duración y precio. Tocar una fila avanza; no hay botón "Continuar" en este paso.

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

- [ ] Contraste de cada combinación de tokens con una herramienta (los valores de arriba están calculados, no medidos en pantalla).
- [ ] Que Geist tenga cifras tabulares activables con `tabular-nums` en la versión que se instale.
- [ ] Formato de hora de `Intl` en `es-CO` en Safari de iOS y en Chrome de Android ("3:00 p. m." con espacio fino).
- [ ] La tira de días con lector de pantalla (VoiceOver y TalkBack): cada día se anuncia completo, "jueves 20 de noviembre, 6 horas libres".
- [ ] El componente de hoja inferior de shadcn/ui (Drawer, sobre vaul) cierra con el gesto atrás de Android.
- [ ] La barra inferior fija con el teclado abierto en iOS.
