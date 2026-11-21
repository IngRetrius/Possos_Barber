import Image from "next/image";
import { useTranslations } from "next-intl";
import { ColorReveal, List, ListRow } from "@possos/ui";
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

/** Cargo en mayúsculas espaciadas y en amarillo, como la línea marcada de los videos. */
const jobTitleClass = "text-label tracking-[0.06em] text-accent uppercase";

/**
 * El barbero en la página pública (docs/11, "El barbero"). Con foto, un cuadro grande 4:5: la foto
 * en gris que toma color al señalarla (`ColorReveal`), y abajo, encima de la foto, el cargo y el
 * nombre. Sin foto, la ficha compacta con las iniciales. Lo que el dueño todavía no entrega dice
 * [PENDIENTE], o se omite con `showPending={false}`. El portafolio va aparte (`PortfolioStrip`).
 */
export function BarberProfile({ barber, photoUrl, showPending = true }: BarberProfileProps) {
  const t = useTranslations("barbers.profile");
  const name = barber.display_name;
  const bio = barber.bio || showPending ? (barber.bio ?? t("bioPending")) : null;

  if (photoUrl) {
    return (
      <article className="overflow-hidden rounded-card border border-border bg-surface">
        {/* El cuadro toma el alto de la foto, no de `aspect-ratio`: con `fill`, un navegador que no
            le daba alto al contenedor dejaba la foto en 0 px (20/11/2026). */}
        <ColorReveal className="relative overflow-hidden">
          <Image
            src={photoUrl}
            alt={t("photoAlt", { name })}
            width={800}
            height={1000}
            sizes="(min-width: 768px) 672px, calc(100vw - 32px)"
            // La cara suele ir en el tercio de arriba: así no se corta al recortar a 4:5.
            className="block aspect-[4/5] h-auto w-full object-cover object-[50%_25%]"
          />
          {/* Degradado al color de la tarjeta: el texto cumple 4,5:1 sobre cualquier foto y la foto
              se funde con la presentación. Baja 1 px de más para que no asome el borde de la foto. */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 -bottom-px h-1/2 bg-linear-to-t from-surface from-15% via-surface/80 via-45% to-transparent"
          />
          <div className="absolute inset-x-0 bottom-0 grid gap-1 p-4">
            {barber.job_title ? <p className={jobTitleClass}>{barber.job_title}</p> : null}
            <h3 className="text-title text-fg">{name}</h3>
          </div>
        </ColorReveal>
        {bio ? <p className="p-4 text-body text-fg-muted">{bio}</p> : null}
      </article>
    );
  }

  return (
    <article className="rounded-card border border-border bg-surface p-4">
      <div className="flex items-center gap-4">
        <div
          className="flex size-16 shrink-0 items-center justify-center rounded-pill bg-surface-2 text-heading text-brand"
          aria-hidden="true"
        >
          {initials(name)}
        </div>
        <div className="grid min-w-0 gap-0.5">
          {barber.job_title ? <p className={jobTitleClass}>{barber.job_title}</p> : null}
          <h3 className="text-label text-fg">{name}</h3>
          {bio ? (
            <p className="text-caption text-fg-muted">
              {bio}
              {showPending ? <span className="block">{t("photoPending")}</span> : null}
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
