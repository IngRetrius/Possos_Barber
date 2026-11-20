import type { MetadataRoute } from "next";
import { LOCALE } from "@possos/config/constants";
import { colors } from "@possos/ui";

/**
 * Manifiesto de la PWA (F8): se instala como "Possos Barber", a pantalla completa, con el
 * monograma de F1 sobre el negro de la marca. Abre en el inicio: el cliente ve su próxima cita
 * y el personal entra al panel desde ahí.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Possos Barber",
    short_name: "Possos",
    description: "Reserva tu corte en Possos Barber, Girardot.",
    lang: LOCALE,
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: colors.bg,
    background_color: colors.bg,
    categories: ["lifestyle", "business"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
