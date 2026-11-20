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
    },
  },
};

export const messages = { es, en };
