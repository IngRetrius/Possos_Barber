"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, parseLocale } from "@possos/config/constants";

/** Un año: el idioma elegido se recuerda en este navegador. */
const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Guarda el idioma elegido con el botón ES/EN. Con JavaScript, Next vuelve a pintar la página en
 * el idioma nuevo sin perder lo que la persona tenía elegido; sin JavaScript, el formulario
 * vuelve a cargar la misma página.
 */
export async function setLocale(formData: FormData): Promise<void> {
  const locale = parseLocale(String(formData.get("locale") ?? ""));
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
  });
}
