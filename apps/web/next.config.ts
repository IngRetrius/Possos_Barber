import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

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

// Serwist (F8): ajusta la configuración para servir el service worker de `app/sw.ts` desde la
// ruta `app/serwist/[path]`.
export default withSerwist(nextConfig);
