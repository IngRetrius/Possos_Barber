import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";
import possos from "./possos-plugin.js";

/** Configuración común para los paquetes. */
export default defineConfig([
  globalIgnores(["**/dist/**", "**/.next/**", "**/coverage/**", "**/database.types.ts"]),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { possos },
    rules: {
      "possos/no-raw-color": "error",
      "possos/no-emoji": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
]);
