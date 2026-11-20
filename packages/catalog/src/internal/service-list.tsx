import { Fragment, type ReactNode } from "react";
import { formatDuration, List, ListDisclosureRow, ListRow, useFormat } from "@possos/ui";
import type { Service } from "../index";
import { groupServices } from "./addons";
import { servicePriceLabel } from "./price";

export interface ServiceListProps {
  services: Service[];
  /** Si se pasa, cada fila lleva a esa ruta (paso "Servicio": tocar una fila avanza). */
  hrefFor?: (service: Service) => string;
  /**
   * Si se pasa, cada fila se despliega con la descripción completa y, debajo, lo que devuelve:
   * los adicionales, las horas y la acción de reservar. Lo arma la app, porque junta el catálogo
   * con la agenda (docs/08). Con `hrefFor`, solo se despliegan las filas para las que devuelve
   * algo; las demás siguen siendo enlaces.
   */
  bookingFor?: (service: Service) => ReactNode;
  /** Servicio que se muestra abierto al cargar (el de la URL). */
  openId?: string | null;
  className?: string;
}

/** Id del ancla de un servicio en la lista, para volver a él al elegir adicionales. */
export const serviceAnchor = (id: string) => `servicio-${id}`;

/**
 * Servicios con duración y precio, agrupados por categoría (docs/11): los que no tienen grupo van
 * juntos en una tarjeta y cada grupo lleva su título ("Color de cabello") y su tarjeta. Así el
 * nombre del grupo no se repite en cada servicio. El precio sin confirmar dice [PENDIENTE].
 */
export function ServiceList({
  services,
  hrefFor,
  bookingFor,
  openId,
  className,
}: ServiceListProps) {
  const { locale } = useFormat();
  const groups = groupServices(services);

  const row = (service: Service) => {
    const content = bookingFor?.(service);
    if (content !== undefined && content !== null) {
      return (
        <ListDisclosureRow
          key={service.id}
          id={serviceAnchor(service.id)}
          group="servicios"
          title={service.name}
          detail={formatDuration(service.duration_min)}
          value={servicePriceLabel(service.price_cop, locale)}
          defaultOpen={service.id === openId}
        >
          {service.description ? (
            <p className="text-body text-fg-muted">{service.description}</p>
          ) : null}
          {content}
        </ListDisclosureRow>
      );
    }
    return (
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
    );
  };

  return (
    <div className={className ?? "grid gap-6"}>
      {groups.map((group, index) =>
        group.category ? (
          <section key={group.category} className="grid gap-3" aria-label={group.category}>
            <h3 className="text-label text-fg-muted">{group.category}</h3>
            <List>{group.services.map(row)}</List>
          </section>
        ) : (
          <Fragment key={`sin-grupo-${index}`}>
            <List>{group.services.map(row)}</List>
          </Fragment>
        ),
      )}
    </div>
  );
}
