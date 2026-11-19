/*
 * Datos de la barbería para la página pública, el resumen de la cita y los datos estructurados.
 * Regla 8 de CLAUDE.md: lo que el dueño todavía no confirmó va en null y la página dice
 * [PENDIENTE]. El horario, los servicios y el barbero salen de la base.
 */

export const PENDING = "[PENDIENTE]";

export const BUSINESS = {
  name: "Possos Barber",
  /** Línea fija bajo el nombre (docs/11). */
  kind: "Barbería en Ibagué",
  /** Frase de presentación del dueño. [PENDIENTE] */
  tagline: null as string | null,
  /** Dirección para mostrar y para el mapa. [PENDIENTE] (decisión 4 de docs/10) */
  address: null as string | null,
  city: "Ibagué",
  region: "Tolima",
  country: "CO",
  instagram: { handle: "possosbarber", url: "https://www.instagram.com/possosbarber/" },
} as const;

/** Dirección para mostrar, o [PENDIENTE]. */
export function addressLabel(): string {
  return BUSINESS.address ?? PENDING;
}

/** Enlace a Google Maps con la dirección (sin clave de API), o null sin dirección. */
export function mapsUrl(): string | null {
  if (!BUSINESS.address) return null;
  const query = encodeURIComponent(`${BUSINESS.address}, ${BUSINESS.city}, Colombia`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

/** Mapa embebido de Google Maps (sin clave de API), o null sin dirección. */
export function mapsEmbedUrl(): string | null {
  if (!BUSINESS.address) return null;
  const query = encodeURIComponent(`${BUSINESS.address}, ${BUSINESS.city}, Colombia`);
  return `https://www.google.com/maps?q=${query}&output=embed`;
}

/**
 * Recordatorios por WhatsApp activos. Se prende en F7, cuando el despacho funcione: antes de eso
 * "Te llega un WhatsApp para confirmar" sería falso.
 */
export const WHATSAPP_REMINDERS_ENABLED = false;

/** URL pública del sitio para metadatos, datos estructurados y el .ics. */
export function siteUrl(): string {
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (production) return `https://${production}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
