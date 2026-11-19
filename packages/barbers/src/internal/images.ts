/*
 * Fotos del barbero y portafolio en Supabase Storage. Las políticas de los buckets solo dejan
 * escribir en la carpeta `<barber_id>/` al barbero dueño y al administrador.
 */

export type ImageBucket = "barber-photos" | "portfolio";

/** Tipos que se aceptan al elegir el archivo. El navegador los pasa a JPEG antes de subirlos. */
export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";

/** Lado mayor de la imagen que se sube, en píxeles. */
export const IMAGE_MAX_SIDE = 1600;

/** Ruta nueva dentro de la carpeta del barbero: `<barber_id>/<aleatorio>.jpg`. */
export function newImagePath(barberId: string, random: string): string {
  return `${barberId}/${random}.jpg`;
}

/** La ruta está dentro de la carpeta del barbero y no sale de ella. */
export function isOwnImagePath(barberId: string, path: string): boolean {
  const parts = path.split("/");
  return (
    parts.length === 2 && parts[0] === barberId && /^[\w-]+\.(jpg|jpeg|png|webp)$/.test(parts[1]!)
  );
}
