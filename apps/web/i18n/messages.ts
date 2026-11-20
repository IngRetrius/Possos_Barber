import type { Locale } from "@possos/config/constants";
import { messages as auth } from "@possos/auth/messages";
import { messages as barbers } from "@possos/barbers/messages";
import { messages as booking } from "@possos/booking/messages";
import { messages as catalog } from "@possos/catalog/messages";
import { messages as commissions } from "@possos/commissions/messages";
import { messages as customers } from "@possos/customers/messages";
import { messages as ui } from "@possos/ui/messages";
import { messages as web } from "./web-messages";

/*
 * Raíz de composición de los textos (docs/08): cada paquete trae los suyos bajo su nombre y la app
 * los junta. next-intl los entrega a los componentes de servidor y de cliente.
 */
function compose(locale: Locale) {
  return {
    ui: ui[locale],
    auth: auth[locale],
    barbers: barbers[locale],
    booking: booking[locale],
    catalog: catalog[locale],
    commissions: commissions[locale],
    customers: customers[locale],
    web: web[locale],
  };
}

export type Messages = ReturnType<typeof compose>;

export const MESSAGES: Record<Locale, Messages> = { es: compose("es"), en: compose("en") };

/*
 * Textos que viajan al navegador fuera del panel. Los componentes de servidor leen todos desde
 * `i18n/request.ts`; a los de cliente solo les llegan los que usan, porque NextIntlClientProvider
 * los serializa en cada página. Sin este recorte, el inicio cargaba también los del panel y la
 * administración (35 KB en total; así quedan unos 10). El panel pone su propio proveedor con todos
 * (`app/(staff)/panel/layout.tsx`).
 *
 * Un componente de cliente nuevo fuera del panel que use otro namespace lo agrega aquí; si no,
 * muestra la clave en vez del texto (`idiomas.spec.ts` revisa las pantallas principales).
 */
function forSite(m: Messages) {
  return {
    ui: m.ui,
    auth: m.auth,
    booking: m.booking,
    customers: { profile: m.customers.profile },
    catalog: { addonPicker: m.catalog.addonPicker },
    web: { common: m.web.common },
  };
}

export const SITE_CLIENT_MESSAGES: Record<Locale, ReturnType<typeof forSite>> = {
  es: forSite(MESSAGES.es),
  en: forSite(MESSAGES.en),
};
