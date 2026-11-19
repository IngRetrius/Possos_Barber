import type { Metadata, Viewport } from "next";
import { LOCALE } from "@possos/config/constants";
import "./globals.css";

export const metadata: Metadata = {
  title: "Possos Barber",
  description: "Reserva tu corte en Possos Barber, Ibagué.",
};

export const viewport: Viewport = {
  themeColor: "#0B0B0B",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={LOCALE}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
