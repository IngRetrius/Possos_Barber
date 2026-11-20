import type { ReactNode } from "react";
import { formatDuration, List, ListDisclosureRow, ListRow, useFormat } from "@possos/ui";
import type { Service } from "../index";
import { servicePriceLabel } from "./price";

export interface ServiceListProps {
  services: Service[];
  /** Si se pasa, cada fila lleva a esa ruta (paso "Servicio": tocar una fila avanza). */
  hrefFor?: (service: Service) => string;
  /**
   * Si se pasa, cada fila se despliega con la descripción completa y, debajo, lo que devuelve:
   * las horas y la acción de reservar (inicio público). Lo arma la app, porque junta el catálogo
   * con la agenda (docs/08). No se combina con `hrefFor`.
   */
  bookingFor?: (service: Service) => ReactNode;
  className?: string;
}

/** Servicios con duración y precio. El precio sin confirmar dice [PENDIENTE]. */
export function ServiceList({ services, hrefFor, bookingFor, className }: ServiceListProps) {
  const { locale } = useFormat();
  if (bookingFor) {
    return (
      <List className={className}>
        {services.map((service) => (
          <ListDisclosureRow
            key={service.id}
            group="servicios"
            title={service.name}
            detail={formatDuration(service.duration_min)}
            value={servicePriceLabel(service.price_cop, locale)}
          >
            {service.description ? (
              <p className="text-body text-fg-muted">{service.description}</p>
            ) : null}
            {bookingFor(service)}
          </ListDisclosureRow>
        ))}
      </List>
    );
  }

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
          value={servicePriceLabel(service.price_cop, locale)}
          href={hrefFor?.(service)}
        />
      ))}
    </List>
  );
}
