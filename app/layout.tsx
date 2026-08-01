import type { Metadata, Viewport } from "next";
import { Archivo, Inter } from "next/font/google";

import "./globals.css";
import { Providers } from "./providers";

// Archivo из мокапа не покрывает кириллицу, зато держит всю числовую
// типографику — суммы, проценты, доли. Кириллица падает на Inter:
// тот же нейтральный гротеск с начертанием 800.
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  variable: "--font-archivo",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600", "800"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Бюджет",
  description: "Личный финансовый помощник",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // скрипт Telegram дописывает свои переменные в <html> раньше гидратации
    <html
      lang="ru"
      className={`${archivo.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" async />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
