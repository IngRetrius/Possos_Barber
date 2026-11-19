import type { Metadata } from "next";
import { Muestras } from "./muestras";

/*
 * Página interna con todos los componentes de @possos/ui y sus estados (F1).
 * Solo existe con `next dev`: la extensión .dev.tsx no cuenta como página en producción
 * (ver pageExtensions en next.config.ts).
 */

export const metadata: Metadata = {
  title: "Muestras · Possos Barber",
  robots: { index: false, follow: false },
};

export default function MuestrasPage() {
  return <Muestras />;
}
