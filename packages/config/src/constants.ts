/**
 * Constantes compartidas por todos los módulos.
 * Todo se guarda en UTC (`timestamptz`) y se muestra en la hora de Bogotá (docs/07-stack.md).
 */

/** Zona horaria de la barbería. Colombia no tiene horario de verano: siempre UTC-5. */
export const TIMEZONE = "America/Bogota";

/** Idioma de la interfaz y del atributo `lang` del documento. */
export const LOCALE = "es-CO";
