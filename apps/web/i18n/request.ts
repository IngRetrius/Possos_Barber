import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { LOCALE_COOKIE, parseLocale, TIMEZONE } from "@possos/config/constants";
import { MESSAGES } from "./messages";

/**
 * Idioma de cada petición (docs/11, "Idiomas"): el de la cookie que pone el botón ES/EN, o el
 * español. Va en una cookie y no en la URL (`/en/...`) para que los enlaces de WhatsApp, de los
 * correos y de los avisos sirvan en los dos idiomas.
 */
export default getRequestConfig(async () => {
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  return { locale, messages: MESSAGES[locale], timeZone: TIMEZONE };
});
