import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
