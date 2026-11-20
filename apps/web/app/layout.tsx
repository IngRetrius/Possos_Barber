import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { LOCALE } from "@possos/config/constants";
import { colors } from "@possos/ui";
import { siteUrl } from "../lib/business";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: "Possos Barber",
  description: "Reserva tu corte en Possos Barber, Girardot.",
  // Los PNG de F1 (public/icons). El manifiesto de la PWA llega en F8.
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: colors.bg,
  colorScheme: "dark",
  // La PWA instalada en iPhone ocupa toda la pantalla; las barras usan pt-safe y pb-safe.
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={LOCALE} className={GeistSans.variable}>
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
