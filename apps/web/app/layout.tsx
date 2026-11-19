import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { LOCALE } from "@possos/config/constants";
import { colors } from "@possos/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "Possos Barber",
  description: "Reserva tu corte en Possos Barber, Ibagué.",
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
