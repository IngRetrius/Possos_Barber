import { auth } from "./web/auth";
import { common } from "./web/common";
import { customer } from "./web/customer";
import { home } from "./web/home";
import { policy } from "./web/policy";

/*
 * Textos propios de la app (páginas, acciones y componentes de apps/web) en español y en inglés,
 * por área. Van bajo la clave "web". En cada área el inglés tiene la misma forma que el español:
 * si falta una clave, TypeScript lo marca.
 */
export const messages = {
  es: { common: common.es, home: home.es, policy: policy.es, auth: auth.es, customer: customer.es },
  en: { common: common.en, home: home.en, policy: policy.en, auth: auth.en, customer: customer.en },
};
