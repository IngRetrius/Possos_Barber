import type { NextConfig } from "next";

/**
 * Las páginas `page.dev.tsx` (como /muestras) solo existen con `next dev`: en el build de
 * producción esa extensión no cuenta como página y la ruta no se genera.
 */
const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  pageExtensions: isDev ? ["dev.tsx", "tsx", "ts", "jsx", "js"] : ["tsx", "ts", "jsx", "js"],
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

export default nextConfig;
