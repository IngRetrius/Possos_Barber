/*
 * Textos de la interfaz de @possos/barbers en español y en inglés (docs/11, "Idiomas"). La app los
 * junta bajo la clave "barbers". El inglés tiene la misma forma que el español: si falta una
 * clave, TypeScript lo marca. Los nombres de los festivos de Colombia quedan en español: son
 * nombres propios.
 */

const es = {
  errors: {
    NOT_AUTHENTICATED: "Ingresa para continuar",
    FORBIDDEN: "No tienes permiso para hacer esto",
    NOT_FOUND: "No encontramos ese barbero",
    INVALID_PERIOD: "Revisa las fechas: el final debe ser después del inicio",
    TIME_OFF_OVERLAP: "Ya tienes un bloqueo en ese horario",
    HOURS_OVERLAP: "Dos rangos del mismo día se cruzan. Revisa las horas",
    INVALID_INPUT: "Revisa los datos e intenta de nuevo",
    ALREADY_LINKED: "Esa cuenta ya tiene otro perfil de barbero",
    UNKNOWN: "No pudimos completar la acción. Intenta de nuevo",
  },
  list: {
    any: "Cualquiera disponible",
    anyDetail: "El que esté libre a la hora que elijas",
  },
  profile: {
    photoAlt: "Foto de {name}",
    photo: "Foto",
    bioPending: "Presentación [PENDIENTE]",
    photoPending: "Foto [PENDIENTE]",
    works: "Trabajos de {name}",
    workAlt: "Trabajo de {name}",
    portfolioPending: "Portafolio [PENDIENTE]",
    hoursPending: "Horario [PENDIENTE]",
  },
  form: {
    name: "Nombre visible",
    bio: "Presentación",
    bioHint: "Una o dos frases para la página pública. Vacía, dice [PENDIENTE].",
    whatsapp: "WhatsApp",
    whatsappHint:
      "El celular de 10 dígitos o un enlace https://wa.me/... Sale en la página pública.",
    interval: "Intervalo de las horas",
    intervalHint: "Cada cuánto empieza una hora libre desde el inicio de cada rango del horario.",
    services: "Servicios que hace",
    noServices: "Todavía no hay servicios activos.",
    active: "Activo",
    activeHint:
      "Inactivo: no aparece en la página pública ni en la reserva. Su agenda y sus cobros se conservan.",
    saved: "Guardaste los cambios",
    saving: "Guardando...",
    save: "Guardar",
    errors: {
      nameRequired: "Escribe el nombre",
      nameTooLong: "Máximo {maxName} caracteres",
      bioTooLong: "Máximo {maxBio} caracteres",
      whatsappInvalid: "Escribe el celular de 10 dígitos o un enlace https://wa.me/...",
      intervalInvalid: "Elige un intervalo de la lista",
    },
  },
  upload: {
    working: "Subiendo...",
    unreadable: "No pudimos leer esa imagen. Usa una foto JPG o PNG.",
    failed: "No pudimos subir la imagen. Revisa tu conexión e intenta de nuevo.",
    notSaved: "No pudimos guardar la imagen. Intenta de nuevo.",
  },
  timeOff: {
    from: "Desde",
    to: "Hasta",
    allDay: "Todo el día",
    start: "Hora de inicio",
    end: "Hora de fin",
    reason: "Motivo",
    reasonHint: "Opcional. Solo lo ve el personal.",
    reasonPlaceholder: "Almuerzo, vacaciones...",
    blocking: "Bloqueando...",
    block: "Bloquear",
    conflicts:
      "Bloqueaste ese horario, pero {count, plural, one {hay 1 cita debajo} other {hay # citas debajo}}. Muévelas o cancélalas:",
    noConflicts: "Bloqueaste ese horario. No había citas.",
  },
  weekly: {
    reviewDays: "Revisa los días marcados",
    saved: "Guardaste el horario",
    closed: "Cerrado",
    rangeFrom: "{day}, rango {n}, desde",
    rangeTo: "{day}, rango {n}, hasta",
    to: "a",
    remove: "Quitar el rango {n} del {day}",
    add: "Agregar rango",
    addTo: " al {day}",
    sameAs: "Igual que el {day}",
    saving: "Guardando...",
    save: "Guardar horario",
    errors: {
      INVALID_RANGE: "Cada rango debe terminar después de empezar",
      HOURS_OVERLAP: "Dos rangos de este día se cruzan",
    },
  },
};

const en: typeof es = {
  errors: {
    NOT_AUTHENTICATED: "Sign in to continue",
    FORBIDDEN: "You don't have permission to do this",
    NOT_FOUND: "We couldn't find that barber",
    INVALID_PERIOD: "Check the dates: the end must be after the start",
    TIME_OFF_OVERLAP: "You already have a block at that time",
    HOURS_OVERLAP: "Two ranges on the same day overlap. Check the hours",
    INVALID_INPUT: "Check the details and try again",
    ALREADY_LINKED: "That account already has another barber profile",
    UNKNOWN: "We couldn't complete the action. Try again",
  },
  list: {
    any: "Anyone available",
    anyDetail: "Whoever is free at the time you choose",
  },
  profile: {
    photoAlt: "Photo of {name}",
    photo: "Photo",
    bioPending: "Introduction [PENDING]",
    photoPending: "Photo [PENDING]",
    works: "Work by {name}",
    workAlt: "Work by {name}",
    portfolioPending: "Portfolio [PENDING]",
    hoursPending: "Opening hours [PENDING]",
  },
  form: {
    name: "Display name",
    bio: "Introduction",
    bioHint: "One or two sentences for the public page. If empty, it says [PENDING].",
    whatsapp: "WhatsApp",
    whatsappHint:
      "The 10-digit mobile number or a https://wa.me/... link. It shows on the public page.",
    interval: "Time interval",
    intervalHint: "How often a free time starts, from the beginning of each range of the schedule.",
    services: "Services they do",
    noServices: "There are no active services yet.",
    active: "Active",
    activeHint:
      "Inactive: they don't show on the public page or in booking. Their schedule and charges are kept.",
    saved: "You saved the changes",
    saving: "Saving...",
    save: "Save",
    errors: {
      nameRequired: "Enter the name",
      nameTooLong: "{maxName} characters at most",
      bioTooLong: "{maxBio} characters at most",
      whatsappInvalid: "Enter the 10-digit mobile number or a https://wa.me/... link",
      intervalInvalid: "Choose an interval from the list",
    },
  },
  upload: {
    working: "Uploading...",
    unreadable: "We couldn't read that image. Use a JPG or PNG photo.",
    failed: "We couldn't upload the image. Check your connection and try again.",
    notSaved: "We couldn't save the image. Try again.",
  },
  timeOff: {
    from: "From",
    to: "To",
    allDay: "All day",
    start: "Start time",
    end: "End time",
    reason: "Reason",
    reasonHint: "Optional. Only staff see it.",
    reasonPlaceholder: "Lunch, vacation...",
    blocking: "Blocking...",
    block: "Block",
    conflicts:
      "You blocked that time, but {count, plural, one {there is 1 appointment in it} other {there are # appointments in it}}. Move or cancel them:",
    noConflicts: "You blocked that time. There were no appointments.",
  },
  weekly: {
    reviewDays: "Check the marked days",
    saved: "You saved the schedule",
    closed: "Closed",
    rangeFrom: "{day}, range {n}, from",
    rangeTo: "{day}, range {n}, to",
    to: "to",
    remove: "Remove range {n} on {day}",
    add: "Add range",
    addTo: " on {day}",
    sameAs: "Same as {day}",
    saving: "Saving...",
    save: "Save schedule",
    errors: {
      INVALID_RANGE: "Each range must end after it starts",
      HOURS_OVERLAP: "Two ranges on this day overlap",
    },
  },
};

export const messages = { es, en };
