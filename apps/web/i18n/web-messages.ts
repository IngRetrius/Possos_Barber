import type { Locale } from "@possos/config/constants";
import { admin } from "./web/admin";
import { agenda } from "./web/agenda";
import { auth } from "./web/auth";
import { common } from "./web/common";
import { customer } from "./web/customer";
import { home } from "./web/home";
import { panel } from "./web/panel";
import { policy } from "./web/policy";
import { staff } from "./web/staff";

/*
 * Textos propios de la app (páginas, acciones y componentes de apps/web) en español y en inglés,
 * por área. Van bajo la clave "web". En cada área el inglés tiene la misma forma que el español:
 * si falta una clave, TypeScript lo marca. Las dos versiones salen de esta misma lista, así que un
 * área nueva queda en los dos idiomas.
 */
const AREAS = { common, home, policy, auth, customer, panel, agenda, admin, staff };

type WebMessages = { [K in keyof typeof AREAS]: (typeof AREAS)[K]["es"] };

function pick(locale: Locale): WebMessages {
  return Object.fromEntries(
    Object.entries(AREAS).map(([area, texts]) => [area, texts[locale]]),
  ) as WebMessages;
}

export const messages: Record<Locale, WebMessages> = { es: pick("es"), en: pick("en") };
