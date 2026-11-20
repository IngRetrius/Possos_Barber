/*
 * Datos de la barbería para la página pública, el resumen de la cita y los datos estructurados.
 * Regla 8 de CLAUDE.md: lo que el dueño todavía no confirmó va en null y la página dice
 * [PENDIENTE]. El horario, los servicios y el barbero salen de la base.
 */

export const PENDING = "[PENDIENTE]";

export const BUSINESS = {
  name: "Possos Barber",
  /** Línea fija bajo el nombre (docs/11). */
  kind: "Barbería en Girardot",
  /** Frase de presentación del dueño. [PENDIENTE] */
  tagline: null as string | null,
  /** Dirección para mostrar, el .ics y los datos estructurados (dueño, 19/11/2026). */
  address: "Manzana 26 Casa 13, barrio Kennedy" as string | null,
  /** Cómo reconocer la casa (dueño, 19/11/2026). */
  addressReference: "Casa esquinera naranja" as string | null,
  city: "Girardot",
  region: "Cundinamarca",
  country: "CO",
  instagram: { handle: "possosbarber", url: "https://www.instagram.com/possosbarber/" },
  /**
   * Ficha de Google Maps que dio el dueño (19/11/2026). Las direcciones por manzana y casa no se
   * geocodifican bien, así que el mapa usa las coordenadas de la ficha y no el texto.
   */
  maps: {
    url: "https://maps.app.goo.gl/3GL17XxTGt2TCffm8",
    latitude: 4.3131339,
    longitude: -74.7898099,
  },
} as const;

/** Dirección para mostrar, o [PENDIENTE]. */
export function addressLabel(): string {
  return BUSINESS.address ?? PENDING;
}

/** Enlace a la ficha de Google Maps (sin clave de API). */
export function mapsUrl(): string | null {
  return BUSINESS.maps.url;
}

/**
 * Mapa embebido de Google Maps (sin clave de API): busca el nombre del negocio alrededor de las
 * coordenadas de la ficha, para que el pin salga con "Possos Barber" y en español.
 */
export function mapsEmbedUrl(): string | null {
  const { latitude, longitude } = BUSINESS.maps;
  const query = encodeURIComponent(BUSINESS.name);
  return `https://www.google.com/maps?q=${query}&ll=${latitude},${longitude}&z=17&hl=es&output=embed`;
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

/**
 * Contacto VAPID de los avisos push (F8). Los servicios de push (Apple, Google) exigen una URL
 * `https:` o un `mailto:`; en local el sitio es `http://localhost`, así que se usa el de
 * producción. No se usa un correo para no exponer el de nadie.
 */
export function pushSubject(): string {
  const url = siteUrl();
  return url.startsWith("https://") ? url : "https://possos-web.vercel.app";
}
