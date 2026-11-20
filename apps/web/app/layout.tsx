import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { HTML_LANG } from "@possos/config/constants";
import { colors } from "@possos/ui";
import { SITE_CLIENT_MESSAGES } from "../i18n/messages";
import { siteUrl } from "../lib/business";
import { PwaRuntime } from "./_components/pwa-runtime";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("web.common.meta");
  return {
    metadataBase: new URL(siteUrl()),
    title: t("title"),
    description: t("description"),
    // Los PNG de F1 (public/icons). El manifiesto está en app/manifest.ts (F8).
    icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
    // Pantalla de inicio de iOS. Barra de estado negra (no translúcida): casi igual al fondo de la
    // app, y ninguna pantalla queda debajo de la isla aunque le falte pt-safe.
    appleWebApp: { capable: true, title: "Possos Barber", statusBarStyle: "black" },
  };
}

export const viewport: Viewport = {
  themeColor: colors.bg,
  colorScheme: "dark",
  // La PWA instalada en iPhone ocupa toda la pantalla; las barras usan pt-safe y pb-safe.
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={HTML_LANG[locale]} className={GeistSans.variable}>
      <body className="min-h-dvh font-sans antialiased">
        {/* Entrega el idioma y los textos a los componentes de cliente: solo los que usan fuera
            del panel (i18n/messages.ts). */}
        <NextIntlClientProvider messages={SITE_CLIENT_MESSAGES[locale]}>
          <PwaRuntime />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
