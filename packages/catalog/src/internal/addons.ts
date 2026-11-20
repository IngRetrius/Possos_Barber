/*
 * Adicionales de un servicio (barba, cejas, diseño): cada uno suma su precio y sus minutos
 * (pedido de Juan, 20/11/2026; docs/09). La base hace la misma cuenta al reservar
 * (private.booking_offer); aquí solo se muestra. No importa ./index para evitar un ciclo.
 */

interface Priced {
  price_cop: number | null;
  duration_min: number;
}

export interface ServiceTotal {
  /** Null si el precio del servicio o el de algún adicional está [PENDIENTE]. */
  priceCop: number | null;
  durationMin: number;
}

/** Precio y duración del servicio con los adicionales elegidos. */
export function withAddons(service: Priced, addons: readonly Priced[]): ServiceTotal {
  const durationMin = addons.reduce((sum, a) => sum + a.duration_min, service.duration_min);
  const pending = service.price_cop === null || addons.some((a) => a.price_cop === null);
  const priceCop = pending
    ? null
    : addons.reduce((sum, a) => sum + (a.price_cop ?? 0), service.price_cop ?? 0);
  return { priceCop, durationMin };
}

/** "Corte + Barba + Cejas": el servicio con sus adicionales, para resúmenes, agenda y avisos. */
export function serviceLabel(name: string, addonNames: readonly string[] = []): string {
  return [name, ...addonNames].join(" + ");
}

/**
 * Los adicionales elegidos que existen en la lista (activos y del servicio), en el orden de la
 * lista y sin repetir. Lo que llega en la URL se filtra con esto antes de usarlo.
 */
export function pickAddons<T extends { id: string }>(
  available: readonly T[],
  ids: readonly string[],
): T[] {
  const wanted = new Set(ids);
  return available.filter((a) => wanted.has(a.id));
}

export interface ServiceGroup<T> {
  /** Título del grupo ("Color de cabello"), o null para un servicio que va solo. */
  category: string | null;
  services: T[];
}

/**
 * Agrupa los servicios por `category` para el inicio. Los de un grupo quedan juntos donde aparece
 * el primero, así el orden del administrador se respeta. Los servicios sin grupo seguidos van
 * juntos, sin título.
 */
export function groupServices<T extends { category: string | null }>(
  services: readonly T[],
): ServiceGroup<T>[] {
  const groups: ServiceGroup<T>[] = [];
  const byCategory = new Map<string, ServiceGroup<T>>();
  for (const service of services) {
    const category = service.category?.trim() || null;
    if (!category) {
      const last = groups.at(-1);
      if (last && last.category === null) last.services.push(service);
      else groups.push({ category: null, services: [service] });
      continue;
    }
    const existing = byCategory.get(category);
    if (existing) {
      existing.services.push(service);
      continue;
    }
    const group = { category, services: [service] };
    byCategory.set(category, group);
    groups.push(group);
  }
  return groups;
}
