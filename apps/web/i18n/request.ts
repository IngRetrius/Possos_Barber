import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { LOCALE_COOKIE, negotiateLocale, parseLocale, TIMEZONE } from "@possos/config/constants";
import { MESSAGES } from "./messages";

/**
 * Idioma de cada petición (docs/11, "Idiomas"): el de la cookie que pone el botón ES/EN y, si la
 * persona nunca lo tocó, el de su dispositivo (`Accept-Language`); si el dispositivo no está en
 * español ni en inglés, el español. Va en una cookie y no en la URL (`/en/...`) para que los
 * enlaces de WhatsApp, de los correos y de los avisos sirvan en los dos idiomas.
 */
export default getRequestConfig(async () => {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = chosen
    ? parseLocale(chosen)
    : negotiateLocale((await headers()).get("accept-language"));
  return { locale, messages: MESSAGES[locale], timeZone: TIMEZONE };
});
