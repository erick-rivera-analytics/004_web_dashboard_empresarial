import type { Metadata } from "next";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { manrope } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Dashboard Empresarial Starter",
  description:
    "Base limpia en Next.js para comenzar un dashboard empresarial conectado a PostgreSQL.",
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
