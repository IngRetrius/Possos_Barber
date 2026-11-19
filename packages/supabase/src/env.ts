/**
 * Variables de entorno de Supabase. Los nombres están en .env.example; los valores,
 * en Vercel y en apps/web/.env.local (regla 6).
 *
 * Las NEXT_PUBLIC_ se leen con acceso literal para que Next las incruste en el bundle del navegador.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}. Revisa .env.example.`);
  }
  return value;
}

export function publicEnv() {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    publishableKey: required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  };
}
