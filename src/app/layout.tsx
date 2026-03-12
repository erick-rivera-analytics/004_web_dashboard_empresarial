import type { Metadata } from "next";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { manrope } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Atlas Empresarial",
  description:
    "Dashboard empresarial conectado a PostgreSQL para indicadores operativos de campo.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning className={`${manrope.variable} antialiased`}>
      <body className={manrope.className}>
        <ThemeProvider defaultTheme="system" storageKey="dashboard-starter-theme">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
