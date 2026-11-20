/*
 * Textos de la interfaz de @possos/customers en español y en inglés (docs/11, "Idiomas"). La app
 * los junta bajo la clave "customers". El inglés tiene la misma forma que el español: si falta
 * una clave, TypeScript lo marca.
 */

const es = {
  errors: {
    NOT_AUTHENTICATED: "Ingresa para continuar",
    FORBIDDEN: "No tienes permiso para hacer esto",
    INVALID_CUSTOMER: "Revisa el nombre y el celular (+57 y 10 dígitos)",
    CONSENT_REQUIRED: "Sin esta autorización no podemos crear tu cuenta",
    UNKNOWN: "No pudimos completar la acción. Intenta de nuevo",
  },
  phone: {
    EMPTY: "Escribe tu celular",
    LENGTH: "El celular debe tener 10 dígitos, sin el +57",
    NOT_MOBILE: "Escribe un número de celular: en Colombia empiezan por 3",
  },
  profile: {
    name: "Nombre",
    phone: "Celular",
    phoneHint: "Para avisarte de tus citas. Nadie más lo ve.",
    readPolicy: "Leer la política de tratamiento de datos",
    consent:
      "Autorizo a Possos Barber a tratar mis datos personales para agendar mis citas, según su política de tratamiento de datos.",
    whatsapp: "Quiero recibir por WhatsApp la confirmación y los recordatorios de mis citas.",
    whatsappHint: "Opcional. Sin esta autorización no te llegan los recordatorios.",
    saved: "Guardamos tus cambios.",
    saving: "Guardando...",
    errors: {
      nameRequired: "Escribe tu nombre",
      nameTooLong: "Escribe un nombre más corto",
      phoneEmpty: "Escribe tu celular",
      phoneLength: "El celular debe tener 10 dígitos, sin el +57",
      phoneNotMobile: "Escribe un número de celular: en Colombia empiezan por 3",
      consentRequired: "Sin esta autorización no podemos crear tu cuenta",
    },
  },
  picker: {
    legend: "Cliente",
    modeLabel: "Cómo elegir el cliente",
    search: "Buscar",
    newCustomer: "Cliente nuevo",
    searchLabel: "Buscar por nombre o celular",
    searching: "Buscando...",
    noResults: "No encontramos clientes con ese nombre o celular. Créalo como cliente nuevo.",
    noCustomers: "Todavía no tienes clientes. Crea uno nuevo.",
    results: "Clientes",
    name: "Nombre",
    phone: "Celular",
    phoneHint: "Para los recordatorios por WhatsApp. Ningún otro cliente lo ve.",
    consent:
      "El cliente autorizó de palabra el tratamiento de sus datos para agendar sus citas, según la <policy>política de tratamiento de datos</policy>.",
    whatsapp: "Quiere recibir por WhatsApp la confirmación y los recordatorios de sus citas.",
    errors: {
      nameRequired: "Escribe el nombre del cliente",
      nameTooLong: "Escribe un nombre más corto",
      phoneEmpty: "Escribe el celular del cliente",
      phoneLength: "El celular debe tener 10 dígitos, sin el +57",
      phoneNotMobile: "Escribe un número de celular: en Colombia empiezan por 3",
      consentRequired: "Sin la autorización del cliente no podemos guardar sus datos",
    },
  },
};

const en: typeof es = {
  errors: {
    NOT_AUTHENTICATED: "Sign in to continue",
    FORBIDDEN: "You don't have permission to do this",
    INVALID_CUSTOMER: "Check the name and the mobile number (+57 and 10 digits)",
    CONSENT_REQUIRED: "Without this authorization we can't create your account",
    UNKNOWN: "We couldn't complete the action. Try again",
  },
  phone: {
    EMPTY: "Enter your mobile number",
    LENGTH: "The mobile number must have 10 digits, without the +57",
    NOT_MOBILE: "Enter a mobile number: in Colombia they start with 3",
  },
  profile: {
    name: "Name",
    phone: "Mobile number",
    phoneHint: "To let you know about your appointments. No one else sees it.",
    readPolicy: "Read the personal data policy",
    consent:
      "I authorize Possos Barber to process my personal data to schedule my appointments, according to its personal data policy.",
    whatsapp: "I want to receive the confirmation and reminders of my appointments on WhatsApp.",
    whatsappHint: "Optional. Without this authorization you won't get reminders.",
    saved: "We saved your changes.",
    saving: "Saving...",
    errors: {
      nameRequired: "Enter your name",
      nameTooLong: "Enter a shorter name",
      phoneEmpty: "Enter your mobile number",
      phoneLength: "The mobile number must have 10 digits, without the +57",
      phoneNotMobile: "Enter a mobile number: in Colombia they start with 3",
      consentRequired: "Without this authorization we can't create your account",
    },
  },
  picker: {
    legend: "Customer",
    modeLabel: "How to choose the customer",
    search: "Search",
    newCustomer: "New customer",
    searchLabel: "Search by name or mobile number",
    searching: "Searching...",
    noResults: "We found no customers with that name or number. Add them as a new customer.",
    noCustomers: "You don't have customers yet. Add a new one.",
    results: "Customers",
    name: "Name",
    phone: "Mobile number",
    phoneHint: "For WhatsApp reminders. No other customer sees it.",
    consent:
      "The customer verbally authorized the processing of their data to schedule their appointments, according to the <policy>personal data policy</policy>.",
    whatsapp: "Wants to receive the confirmation and reminders of their appointments on WhatsApp.",
    errors: {
      nameRequired: "Enter the customer's name",
      nameTooLong: "Enter a shorter name",
      phoneEmpty: "Enter the customer's mobile number",
      phoneLength: "The mobile number must have 10 digits, without the +57",
      phoneNotMobile: "Enter a mobile number: in Colombia they start with 3",
      consentRequired: "Without the customer's authorization we can't save their data",
    },
  },
};

export const messages = { es, en };
