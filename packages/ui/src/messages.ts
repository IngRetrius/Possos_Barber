/*
 * Textos de la interfaz de @possos/ui en español y en inglés (docs/11, "Idiomas"). La app los
 * junta bajo la clave "ui". El inglés tiene la misma forma que el español: si falta una clave,
 * TypeScript lo marca.
 */

const es = {
  tabBar: { label: "Principal" },
  dateStrip: {
    label: "Día",
    noSlots: "Sin horas",
    dayName: "{date}, {slots, plural, =0 {sin horas} one {# hora libre} other {# horas libres}}",
  },
  slotGrid: { label: "Horas libres" },
  sheet: { close: "Cerrar" },
  stepHeader: { back: "Atrás", step: "Paso {step} de {total}" },
  phone: { prefix: "Prefijo" },
};

const en: typeof es = {
  tabBar: { label: "Main" },
  dateStrip: {
    label: "Day",
    noSlots: "No times",
    dayName:
      "{date}, {slots, plural, =0 {no times available} one {# time available} other {# times available}}",
  },
  slotGrid: { label: "Available times" },
  sheet: { close: "Close" },
  stepHeader: { back: "Back", step: "Step {step} of {total}" },
  phone: { prefix: "Prefix" },
};

export const messages = { es, en };
