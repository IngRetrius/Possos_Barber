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
}

export interface BarberProfileProps {
  barber: Barber;
  photoUrl: string | null;
  portfolio: PortfolioImage[];
}

/**
 * El barbero en la página pública: foto, nombre, presentación y portafolio. Lo que el dueño
 * todavía no entrega dice [PENDIENTE].
 */
export function BarberProfile({ barber, photoUrl, portfolio }: BarberProfileProps) {
  const t = useTranslations("barbers.profile");
  const name = barber.display_name;
  return (
    <article className="grid gap-4 rounded-card border border-border bg-surface p-4">
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
            className="flex size-16 shrink-0 items-center justify-center rounded-pill border border-border text-caption text-fg-subtle"
            aria-hidden="true"
          >
            {t("photo")}
          </div>
        )}
        <div className="grid min-w-0 gap-0.5">
          <h3 className="text-label text-fg">{barber.display_name}</h3>
          <p className="text-caption text-fg-muted">
            {barber.bio ?? t("bioPending")}
            {photoUrl ? null : <span className="block">{t("photoPending")}</span>}
          </p>
        </div>
      </div>
      {portfolio.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2" aria-label={t("works", { name })}>
          {portfolio.map((item) => (
            <li key={item.id} className="relative aspect-square overflow-hidden rounded-card">
              <Image
                src={item.url}
                alt={item.caption ?? t("workAlt", { name })}
                fill
                sizes="(min-width: 768px) 200px, 33vw"
                className="object-cover"
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-caption text-fg-muted">{t("portfolioPending")}</p>
      )}
    </article>
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
