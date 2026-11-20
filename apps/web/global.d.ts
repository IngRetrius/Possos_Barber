import type { Locale } from "@possos/config/constants";
import type { Messages } from "./i18n/messages";

// Claves de next-intl con tipos: una clave que no existe en el español es un error de TypeScript,
// también dentro de los paquetes que la app compila.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
