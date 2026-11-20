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
