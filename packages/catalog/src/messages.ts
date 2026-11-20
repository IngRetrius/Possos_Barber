/*
 * Textos de la interfaz de @possos/catalog en español y en inglés (docs/11, "Idiomas"). La app los
 * junta bajo la clave "catalog". El inglés tiene la misma forma que el español: si falta una
 * clave, TypeScript lo marca.
 */

const es = {
  serviceForm: {
    name: "Nombre",
    duration: "Duración en minutos",
    durationHint: "En múltiplos de 5.",
    price: "Precio en pesos",
    priceHint: "Déjalo vacío si todavía no está definido: los clientes verán [PENDIENTE].",
    description: "Descripción",
    descriptionHint: "Opcional.",
    category: "Grupo",
    categoryHint:
      "Opcional. Los servicios con el mismo grupo van juntos en el inicio, bajo ese título (por ejemplo, Color de cabello).",
    active: "Activo",
    activeHint:
      "Si lo desactivas, los clientes ya no lo pueden reservar. Las citas que existen no cambian.",
    saving: "Guardando...",
    errors: {
      nameRequired: "Escribe el nombre del servicio",
      nameTooLong: "Máximo {maxName} caracteres",
      descriptionTooLong: "Máximo {maxDescription} caracteres",
      durationInvalid: "Escribe los minutos en múltiplos de 5 (por ejemplo, 60)",
      priceInvalid: "Escribe el precio en pesos, sin centavos (por ejemplo, 30.000)",
      categoryTooLong: "Máximo {maxCategory} caracteres",
    },
  },
  addonPicker: {
    legend: "Agrega",
    total: "Total",
    update: "Ver horas con lo que agregaste",
  },
  addonForm: {
    name: "Nombre",
    nameHint: "Lo que se agrega al servicio, por ejemplo Barba o Cejas.",
    price: "Precio en pesos",
    priceHint:
      "Lo que suma al precio. Déjalo vacío si todavía no está definido: el total dirá [PENDIENTE].",
    duration: "Minutos que suma",
    durationHint: "En múltiplos de 5. Pon 0 si se hace en el mismo tiempo del servicio.",
    active: "Activo",
    activeHint:
      "Si lo desactivas, los clientes ya no lo pueden agregar. Las citas que lo tienen no cambian.",
    saving: "Guardando...",
    errors: {
      nameRequired: "Escribe el nombre del adicional",
      nameTooLong: "Máximo {maxName} caracteres",
      durationInvalid: "Escribe los minutos en múltiplos de 5 (0, 15, 30, 60...)",
      priceInvalid: "Escribe el precio en pesos, sin centavos (por ejemplo, 5.000)",
    },
  },
};

const en: typeof es = {
  serviceForm: {
    name: "Name",
    duration: "Duration in minutes",
    durationHint: "In multiples of 5.",
    price: "Price in pesos",
    priceHint: "Leave it empty if it is not set yet: customers will see [PENDING].",
    description: "Description",
    descriptionHint: "Optional.",
    category: "Group",
    categoryHint:
      "Optional. Services with the same group appear together on the home page, under that title (for example, Color de cabello).",
    active: "Active",
    activeHint:
      "If you turn it off, customers can no longer book it. Existing appointments do not change.",
    saving: "Saving...",
    errors: {
      nameRequired: "Enter the name of the service",
      nameTooLong: "{maxName} characters at most",
      descriptionTooLong: "{maxDescription} characters at most",
      durationInvalid: "Enter the minutes in multiples of 5 (for example, 60)",
      priceInvalid: "Enter the price in pesos, without cents (for example, 30.000)",
      categoryTooLong: "{maxCategory} characters at most",
    },
  },
  addonPicker: {
    legend: "Add",
    total: "Total",
    update: "See times with your add-ons",
  },
  addonForm: {
    name: "Name",
    nameHint: "What is added to the service, for example Barba or Cejas.",
    price: "Price in pesos",
    priceHint:
      "What it adds to the price. Leave it empty if it is not set yet: the total will say [PENDING].",
    duration: "Minutes it adds",
    durationHint: "In multiples of 5. Enter 0 if it fits in the time of the service.",
    active: "Active",
    activeHint:
      "If you turn it off, customers can no longer add it. Appointments that have it do not change.",
    saving: "Saving...",
    errors: {
      nameRequired: "Enter the name of the add-on",
      nameTooLong: "{maxName} characters at most",
      durationInvalid: "Enter the minutes in multiples of 5 (0, 15, 30, 60...)",
      priceInvalid: "Enter the price in pesos, without cents (for example, 5.000)",
    },
  },
};

export const messages = { es, en };
