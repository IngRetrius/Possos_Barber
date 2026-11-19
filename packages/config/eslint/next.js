import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import base from "./base.js";

/** Configuración para apps/web: la base más las reglas de Next. */
export default defineConfig([...base, ...nextVitals, ...nextTs]);
