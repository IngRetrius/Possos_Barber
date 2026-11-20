/*
 * Textos de la interfaz de @possos/commissions en español y en inglés (docs/11, "Idiomas"). La
 * app los junta bajo la clave "commissions". El inglés tiene la misma forma que el español: si
 * falta una clave, TypeScript lo marca. En ningún idioma se dice "factura" ("invoice"): no es
 * factura electrónica de la DIAN (CLAUDE.md).
 */

const es = {
  chargeForm: {
    amount: "Valor cobrado",
    amountRequired: "Escribe el valor cobrado",
    noPrice: "El servicio no tiene precio definido: escribe lo que se cobró.",
    business: "Para la barbería",
    noRate: "Falta definir el porcentaje de este barbero",
    back: "Volver",
  },
  periods: {
    hoy: "Hoy",
    semana: "Esta semana",
    quincena: "Esta quincena",
    mes: "Este mes",
    rango: "Rango",
  },
  errors: {
    NOT_AUTHENTICATED: "Ingresa para continuar",
    FORBIDDEN: "No tienes permiso para hacer esto",
    NOT_FOUND: "No encontramos ese cobro",
    NOT_COMPLETED: "Primero marca que el cliente vino",
    ALREADY_CHARGED: "Esta cita ya tiene un cobro",
    INVALID_AMOUNT: "Escribe un valor válido",
    NO_COMMISSION_RATE: "Falta definir el porcentaje de este barbero",
    TOO_LATE_TO_EDIT: "Solo puedes corregir los cobros del mismo día",
    INVALID_STATUS: "Este cobro está anulado",
    INVALID_PERIOD: "Revisa las fechas: el final debe ser después del inicio",
    REASON_REQUIRED: "Escribe el motivo",
    UNKNOWN: "No pudimos completar la acción. Intenta de nuevo",
  },
};

const en: typeof es = {
  chargeForm: {
    amount: "Amount charged",
    amountRequired: "Enter the amount charged",
    noPrice: "The service has no set price: enter what was charged.",
    business: "For the barbershop",
    noRate: "This barber's percentage is not set yet",
    back: "Back",
  },
  periods: {
    hoy: "Today",
    semana: "This week",
    quincena: "This fortnight",
    mes: "This month",
    rango: "Range",
  },
  errors: {
    NOT_AUTHENTICATED: "Sign in to continue",
    FORBIDDEN: "You don't have permission to do this",
    NOT_FOUND: "We couldn't find that charge",
    NOT_COMPLETED: "First mark that the customer came",
    ALREADY_CHARGED: "This appointment already has a charge",
    INVALID_AMOUNT: "Enter a valid amount",
    NO_COMMISSION_RATE: "This barber's percentage is not set yet",
    TOO_LATE_TO_EDIT: "You can only correct charges from the same day",
    INVALID_STATUS: "This charge was voided",
    INVALID_PERIOD: "Check the dates: the end must be after the start",
    REASON_REQUIRED: "Enter the reason",
    UNKNOWN: "We couldn't complete the action. Try again",
  },
};

export const messages = { es, en };
