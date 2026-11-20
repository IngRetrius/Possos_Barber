import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";
import createNextIntlPlugin from "next-intl/plugin";

/**
 * Las páginas `page.dev.tsx` (como /muestras) solo existen con `next dev`: en el build de
 * producción esa extensión no cuenta como página y la ruta no se genera.
 */
const isDev = process.env.NODE_ENV === "development";

/**
 * Fotos del barbero y portafolio: buckets públicos de Supabase Storage, optimizados con
 * next/image. En local, Supabase está en 127.0.0.1, que Next bloquea por omisión.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const storagePattern = supabaseUrl ? [new URL(`${supabaseUrl}/storage/v1/object/public/**`)] : [];

const nextConfig: NextConfig = {
  pageExtensions: isDev ? ["dev.tsx", "tsx", "ts", "jsx", "js"] : ["tsx", "ts", "jsx", "js"],
  // Solo para `next dev`: abrir la app desde un celular en la misma red Wi-Fi (http://192.168.x.x:3000).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  images: {
    remotePatterns: storagePattern,
    // AVIF primero (pesa alrededor de un 20 % menos que WebP) y WebP para el navegador que no lo
    // lea. Duplica las transformaciones por imagen, pero son pocas fotos y sus rutas no cambian
    // (cada subida es un archivo nuevo con caché de un año), así que se transforman una vez.
    formats: ["image/avif", "image/webp"],
    dangerouslyAllowLocalIP: isDev,
  },
  // Los paquetes del monorepo exponen TypeScript sin compilar (campo `exports` → src/*.ts).
  transpilePackages: [
    "@possos/auth",
    "@possos/barbers",
    "@possos/booking",
    "@possos/catalog",
    "@possos/commissions",
    "@possos/config",
    "@possos/customers",
    "@possos/notifications",
    "@possos/supabase",
    "@possos/ui",
  ],
};

// next-intl lee el idioma y los textos de cada petición en `i18n/request.ts` (docs/11, "Idiomas").
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Serwist (F8): ajusta la configuración para servir el service worker de `app/sw.ts` desde la
// ruta `app/serwist/[path]`.
export default withSerwist(withNextIntl(nextConfig));
