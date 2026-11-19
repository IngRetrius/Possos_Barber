import { formatDuration, List, ListRow } from "@possos/ui";
import type { Service } from "../index";
import { servicePriceLabel } from "./price";

export interface ServiceListProps {
  services: Service[];
  /** Si se pasa, cada fila lleva a esa ruta (paso "Servicio": tocar una fila avanza). */
  hrefFor?: (service: Service) => string;
  className?: string;
}

/** Servicios con duración y precio. El precio sin confirmar dice [PENDIENTE]. */
export function ServiceList({ services, hrefFor, className }: ServiceListProps) {
  return (
    <List className={className}>
      {services.map((service) => (
        <ListRow
          key={service.id}
          title={service.name}
          detail={
            service.description
              ? `${formatDuration(service.duration_min)} · ${service.description}`
              : formatDuration(service.duration_min)
          }
          value={servicePriceLabel(service.price_cop)}
          href={hrefFor?.(service)}
        />
      ))}
    </List>
  );
}
