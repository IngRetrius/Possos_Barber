import Image from "next/image";
import { useTranslations } from "next-intl";
import { List, ListRow } from "@possos/ui";
import type { Barber, OpeningHoursGroup } from "../index";

export interface BarberListProps {
  barbers: Barber[];
  hrefFor: (barber: Barber) => string;
  /** Ruta de "Cualquiera disponible". */
  anyHref: string;
  className?: string;
}

/** Paso "Barbero": "Cualquiera disponible" primero y después cada barbero. Tocar una fila avanza. */
export function BarberList({ barbers, hrefFor, anyHref, className }: BarberListProps) {
  const t = useTranslations("barbers.list");
  return (
    <List className={className}>
      <ListRow title={t("any")} detail={t("anyDetail")} href={anyHref} />
      {barbers.map((barber) => (
        <ListRow key={barber.id} title={barber.display_name} href={hrefFor(barber)} />
      ))}
    </List>
  );
}

export interface PortfolioImage {
  id: string;
  url: string;
  caption: string | null;
  /** Para el texto alternativo cuando el trabajo no tiene descripción. */
  barberName: string;
}

export interface BarberProfileProps {
  barber: Barber;
  photoUrl: string | null;
  /**
   * Si dice [PENDIENTE] lo que falta (presentación y foto). La app lo apaga en producción para
   * que el cliente no vea una ficha a medio hacer; sin foto quedan las iniciales.
   */
  showPending?: boolean;
}

/** Iniciales para el avatar sin foto: "Santiago Possos" da "SP". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const picked = words.length > 1 ? [words[0]!, words[words.length - 1]!] : words.slice(0, 1);
  return picked.map((word) => word[0]!.toLocaleUpperCase()).join("");
}

/**
 * El barbero en la página pública: foto, nombre y presentación. Lo que el dueño todavía no
 * entrega dice [PENDIENTE], o se omite con `showPending={false}`. El portafolio va aparte, arriba
 * del inicio (`PortfolioStrip`).
 */
export function BarberProfile({ barber, photoUrl, showPending = true }: BarberProfileProps) {
  const t = useTranslations("barbers.profile");
  const name = barber.display_name;
  return (
    <article className="rounded-card border border-border bg-surface p-4">
      <div className="flex items-center gap-4">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={t("photoAlt", { name })}
            width={64}
            height={64}
            sizes="64px"
            className="size-16 shrink-0 rounded-pill border border-border object-cover"
          />
        ) : (
          <div
            className="flex size-16 shrink-0 items-center justify-center rounded-pill bg-surface-2 text-heading text-brand"
            aria-hidden="true"
          >
            {initials(name)}
          </div>
        )}
        <div className="grid min-w-0 gap-0.5">
          <h3 className="text-label text-fg">{barber.display_name}</h3>
          {barber.bio || showPending ? (
            <p className="text-caption text-fg-muted">
              {barber.bio ?? t("bioPending")}
              {photoUrl || !showPending ? null : <span className="block">{t("photoPending")}</span>}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export interface PortfolioStripProps {
  items: PortfolioImage[];
  /** Id del título de la sección: nombra la lista para el lector de pantalla. */
  labelledBy: string;
}

/**
 * Trabajos del portafolio en una fila que se desliza de lado (docs/11, "Inicio público"). Cada
 * foto va en 3:4, el formato vertical del celular y de la cuadrícula de Instagram, así que la
 * cabeza no se corta como en un cuadrado. En 390 px cada foto ocupa el 44 % del ancho: se ven dos
 * y asoma la tercera, que es la pista de que hay más. En escritorio caben tres sin deslizar.
 *
 * La fila es enfocable para moverla con las flechas del teclado (WCAG 2.1.1). Sin flechas ni
 * puntos ni rotación automática: es contenido de apoyo, no lo único que lleva a reservar.
 */
export function PortfolioStrip({ items, labelledBy }: PortfolioStripProps) {
  const t = useTranslations("barbers.profile");
  return (
    <ul
      aria-labelledby={labelledBy}
      // Enfocable para desplazarla con el teclado; las fotos no son interactivas.
      tabIndex={0}
      className="-mx-gutter flex snap-x snap-mandatory scroll-px-gutter gap-2 overflow-x-auto overscroll-x-contain px-gutter [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden"
    >
      {items.map((item, index) => (
        <li
          key={item.id}
          className="relative aspect-[3/4] w-[44%] shrink-0 snap-start overflow-hidden rounded-card bg-surface-2 md:w-52"
        >
          <Image
            src={item.url}
            alt={item.caption ?? t("workAlt", { name: item.barberName })}
            fill
            sizes="(min-width: 768px) 208px, 44vw"
            // Las dos primeras se ven al abrir el inicio; las demás cargan al acercarse.
            loading={index < 2 ? "eager" : "lazy"}
            className="object-cover"
          />
        </li>
      ))}
    </ul>
  );
}

/** Horario de la barbería agrupado por días. Sin horario dice [PENDIENTE]. */
export function OpeningHoursList({
  groups,
  className,
}: {
  groups: OpeningHoursGroup[];
  className?: string;
}) {
  const t = useTranslations("barbers.profile");
  if (groups.length === 0) {
    return <p className={className}>{t("hoursPending")}</p>;
  }
  return (
    <dl className={className ? `grid gap-3 ${className}` : "grid gap-3"}>
      {groups.map((group) => (
        <div key={group.days} className="grid gap-0.5">
          <dt className="text-label text-fg">{group.days}</dt>
          <dd
            className={
              group.closed ? "text-body text-fg-subtle" : "text-body text-fg-muted tabular-nums"
            }
          >
            {group.hours}
          </dd>
        </div>
      ))}
    </dl>
  );
}
