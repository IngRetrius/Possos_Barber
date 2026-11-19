/**
 * Reglas de modularidad de docs/08-estructura-monorepo.md.
 *
 * Grafo permitido:
 *   ui, supabase, config          ← base, sin dominio
 *   auth                          ← ui, supabase
 *   catalog, barbers, customers   ← ui, supabase, auth
 *   booking                       ← ui, supabase, auth, catalog, barbers, customers
 *   commissions                   ← ui, supabase, auth, barbers, booking
 *   notifications                 ← supabase, booking
 *   apps/web                      ← todos (raíz de composición)
 *
 * @type {import("dependency-cruiser").IConfiguration}
 */

const DOMAIN = "auth|catalog|barbers|customers|booking|commissions|notifications";

/** Archivos que un paquete puede declarar en su campo `exports` (más el CSS de `ui`). */
const PUBLIC_ENTRY =
  "^packages/[^/]+/src/((index|server|ui|client|events|admin|constants|proxy)\\.tsx?|styles\\.css)$";

/** Prohíbe que `from` importe alguno de los paquetes de `to`. */
const forbidPackages = (name, from, to, comment) => ({
  name,
  severity: "error",
  comment,
  from: { path: `^packages/(${from})/` },
  to: { path: `^packages/(${to})/`, pathNot: "^packages/$1/" },
});

module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Las dependencias van en un solo sentido; no hay ciclos.",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-unresolvable",
      severity: "error",
      comment:
        "No resuelve: suele ser una ruta que el paquete no declara en `exports` " +
        "(por ejemplo, @possos/booking/src/internal/x).",
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: "only-public-api",
      severity: "error",
      comment:
        "Un paquete solo importa de otro lo que este declara en `exports` (regla 1 de docs/08). " +
        "Nada de rutas relativas hacia src/ ajeno ni de archivos internos.",
      from: { path: "^(apps|packages)/([^/]+)/" },
      to: {
        path: "^packages/[^/]+/",
        pathNot: ["^packages/$2/", PUBLIC_ENTRY, "^packages/config/(tsconfig|eslint)/"],
      },
    },
    {
      name: "packages-not-to-apps",
      severity: "error",
      comment: "apps/web es la raíz de composición; ningún paquete la importa.",
      from: { path: "^packages/" },
      to: { path: "^apps/" },
    },
    forbidPackages(
      "base-without-domain",
      "ui|supabase|config",
      DOMAIN,
      "ui, supabase y config son la base y no conocen ningún dominio.",
    ),
    forbidPackages(
      "auth-graph",
      "auth",
      "catalog|barbers|customers|booking|commissions|notifications",
      "auth solo depende de ui y supabase.",
    ),
    forbidPackages(
      "catalog-barbers-customers-graph",
      "catalog|barbers|customers",
      "catalog|barbers|customers|booking|commissions|notifications",
      "catalog, barbers y customers solo dependen de ui, supabase y auth.",
    ),
    forbidPackages(
      "booking-graph",
      "booking",
      "commissions|notifications",
      "booking no conoce a notifications ni a commissions; se comunica por booking_events.",
    ),
    forbidPackages(
      "commissions-graph",
      "commissions",
      "catalog|customers|notifications",
      "commissions depende de ui, supabase, auth, barbers y booking.",
    ),
    forbidPackages(
      "notifications-graph",
      "notifications",
      "ui|auth|catalog|barbers|customers|commissions",
      "notifications solo depende de supabase y de la API pública de booking.",
    ),
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "(^|/)(node_modules|\\.next|\\.turbo|dist|coverage)/" },
    tsPreCompilationDeps: true,
    combinedDependencies: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      mainFields: ["module", "main", "types", "typings"],
      extensions: [".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", ".d.ts"],
    },
    skipAnalysisNotInRules: true,
  },
};
