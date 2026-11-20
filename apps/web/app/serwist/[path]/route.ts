import { randomUUID } from "node:crypto";
import { createSerwistRoute } from "@serwist/turbopack";

/**
 * Sirve el service worker compilado (`/serwist/sw.js` y su mapa). `@serwist/turbopack` compila
 * `app/sw.ts` con esbuild durante el build (Next 16 usa Turbopack; ver docs/07).
 *
 * La pantalla sin conexión no va en la precarga: `app/sw.ts` la guarda en su propia caché al
 * instalarse, también en desarrollo.
 */
const revision = process.env.VERCEL_GIT_COMMIT_SHA ?? randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute(
  {
    swSrc: "app/sw.ts",
    useNativeEsbuild: true,
    // Lo de Serwist por omisión más las fuentes (Geist), para que sin conexión la letra sea la misma.
    globPatterns: [".next/static/**/*.{js,css,woff2,png,svg,webp,ico,json}", "public/**/*"],
    additionalPrecacheEntries: [{ url: "/manifest.webmanifest", revision }],
  },
);
