/** Textos que comparten varias pantallas de la app: encabezado, PWA, errores y metadatos. */

const es = {
  meta: {
    title: "Possos Barber",
    description: "Reserva tu corte en Possos Barber, Girardot.",
    suffix: "{title} · Possos Barber",
  },
  header: { home: "Possos Barber, ir al inicio" },
  book: "Reservar",
  bookService: "Reservar este servicio",
  retry: "Intentar de nuevo",
  install: {
    install: "Instalar la app",
    iosTitle: "Instala la app en tu iPhone",
    step1: "En Safari, toca el botón Compartir.",
    step2: "Busca en la lista “Agregar a inicio” y tócalo.",
    step3: "Toca “Agregar”. Possos Barber queda en tu pantalla de inicio.",
  },
  error: {
    title: "Algo salió mal",
    offlineTitle: "Sin conexión",
    body: "No pudimos completar la acción. Intenta de nuevo.",
    offlineBody:
      "No pudimos completar la acción. Para reservar, cambiar o cancelar necesitas conexión.",
  },
  offline: {
    metaTitle: "Sin conexión",
    title: "Sin conexión",
    body: "No pudimos cargar esta página. Revisa tu conexión e intenta de nuevo.",
    hint: "Para ver las horas libres, reservar, cambiar o cancelar necesitas conexión. Tus citas se pueden ver sin conexión en Mis citas si ya las abriste en este celular.",
    myAppointments: "Ver mis citas",
  },
  pwa: {
    offline: "Sin conexión. Para reservar, cambiar o cancelar necesitas conexión.",
    newVersion: "Hay una versión nueva.",
    updating: "Actualizando...",
    update: "Actualizar",
  },
};

const en: typeof es = {
  meta: {
    title: "Possos Barber",
    description: "Book your haircut at Possos Barber, Girardot.",
    suffix: "{title} · Possos Barber",
  },
  header: { home: "Possos Barber, go to home" },
  book: "Book",
  bookService: "Book this service",
  retry: "Try again",
  install: {
    install: "Install the app",
    iosTitle: "Install the app on your iPhone",
    step1: "In Safari, tap the Share button.",
    step2: "Find “Add to Home Screen” in the list and tap it.",
    step3: "Tap “Add”. Possos Barber stays on your home screen.",
  },
  error: {
    title: "Something went wrong",
    offlineTitle: "No connection",
    body: "We couldn't complete the action. Try again.",
    offlineBody:
      "We couldn't complete the action. To book, change or cancel you need a connection.",
  },
  offline: {
    metaTitle: "No connection",
    title: "No connection",
    body: "We couldn't load this page. Check your connection and try again.",
    hint: "To see free times, book, change or cancel you need a connection. You can see your appointments offline in My appointments if you already opened them on this phone.",
    myAppointments: "See my appointments",
  },
  pwa: {
    offline: "No connection. To book, change or cancel you need a connection.",
    newVersion: "There is a new version.",
    updating: "Updating...",
    update: "Update",
  },
};

export const common = { es, en };
