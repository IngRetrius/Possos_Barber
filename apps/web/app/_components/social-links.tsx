import type { SVGProps } from "react";

/*
 * Íconos de Phosphor 2.1.1, peso "regular". Copyright (c) Phosphor Icons, licencia MIT
 * (https://github.com/phosphor-icons/core/blob/main/LICENSE). Lucide ya no trae
 * marcas; Phosphor regular es de contorno con trazo proporcional de 1,5 px a 24 px, como los
 * íconos Lucide del resto de la app (docs/11, "Íconos"). Van en línea para no sumar una
 * dependencia por dos íconos. Monocromos con `currentColor`, sin los colores de cada marca.
 */

function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160ZM176,24H80A56.06,56.06,0,0,0,24,80v96a56.06,56.06,0,0,0,56,56h96a56.06,56.06,0,0,0,56-56V80A56.06,56.06,0,0,0,176,24Zm40,152a40,40,0,0,1-40,40H80a40,40,0,0,1-40-40V80A40,40,0,0,1,80,40h96a40,40,0,0,1,40,40ZM192,76a12,12,0,1,1-12-12A12,12,0,0,1,192,76Z" />
    </svg>
  );
}

function TiktokIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M224,72a48.05,48.05,0,0,1-48-48,8,8,0,0,0-8-8H128a8,8,0,0,0-8,8V156a20,20,0,1,1-28.57-18.08A8,8,0,0,0,96,130.69V88a8,8,0,0,0-9.4-7.88C50.91,86.48,24,119.1,24,156a76,76,0,0,0,152,0V116.29A103.25,103.25,0,0,0,224,128a8,8,0,0,0,8-8V80A8,8,0,0,0,224,72Zm-8,39.64a87.19,87.19,0,0,1-43.33-16.15A8,8,0,0,0,160,102v54a60,60,0,0,1-120,0c0-25.9,16.64-49.13,40-57.6v27.67A36,36,0,1,0,136,156V32h24.5A64.14,64.14,0,0,0,216,87.5Z" />
    </svg>
  );
}

const ICONS = { instagram: InstagramIcon, tiktok: TiktokIcon } as const;

export interface SocialLink {
  network: keyof typeof ICONS;
  url: string;
  /** Nombre accesible: la red y la cuenta ("Instagram @possosbarber"). */
  label: string;
}

/**
 * Redes de la barbería en Contacto, solo con su ícono (pedido de Juan, 20/11/2026). Sin texto
 * visible, el nombre lo da `aria-label`. Cada enlace mide 48 × 48 px (docs/11, "Tamaño táctil"),
 * con 8 px entre uno y otro. El ícono va en `--fg` sobre `--surface` y el borde se refuerza al
 * pasar o presionar, como las horas libres.
 */
export function SocialLinks({ links, label }: { links: SocialLink[]; label: string }) {
  return (
    <ul aria-label={label} className="flex gap-2">
      {links.map(({ network, url, label: name }) => {
        const Icon = ICONS[network];
        return (
          <li key={network}>
            <a
              href={url}
              aria-label={name}
              rel="noopener noreferrer"
              className="flex size-12 items-center justify-center rounded-card border border-border bg-surface text-fg transition-colors duration-150 ease-out hover:border-border-strong hover:bg-surface-2 active:bg-surface-2"
            >
              <Icon className="size-6" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
