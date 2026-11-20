import Link from "next/link";
import { Button, formatDuration, List, ListDisclosureRow, ListRow } from "@possos/ui";
import type { Service } from "../index";
import { servicePriceLabel } from "./price";

export interface ServiceListProps {
  services: Service[];
  /** Si se pasa, cada fila lleva a esa ruta (paso "Servicio": tocar una fila avanza). */
  hrefFor?: (service: Service) => string;
  /**
   * Si se pasa, cada fila se despliega con la descripción completa y "Reservar este servicio",
   * que lleva a esa ruta (inicio público). No se combina con `hrefFor`.
   */
  bookHrefFor?: (service: Service) => string;
  className?: string;
}

/** Servicios con duración y precio. El precio sin confirmar dice [PENDIENTE]. */
export function ServiceList({ services, hrefFor, bookHrefFor, className }: ServiceListProps) {
  if (bookHrefFor) {
    return (
      <List className={className}>
        {services.map((service) => (
          <ListDisclosureRow
            key={service.id}
            group="servicios"
            title={service.name}
            detail={formatDuration(service.duration_min)}
            value={servicePriceLabel(service.price_cop)}
          >
            {service.description ? (
              <p className="text-body text-fg-muted">{service.description}</p>
            ) : null}
            <Button asChild variant="secondary" className="w-full">
              <Link href={bookHrefFor(service)}>Reservar este servicio</Link>
            </Button>
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
          value={servicePriceLabel(service.price_cop)}
          href={hrefFor?.(service)}
        />
      ))}
    </List>
  );
}
