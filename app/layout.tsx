import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/providers";
import "./globals.css";

// Fontes self-hosted (app/fonts) para o build não depender do Google Fonts.
// Arquivos variáveis: Inter (wght 100-900) e JetBrains Mono (wght 100-800), subset latin.
const inter = localFont({
  src: "./fonts/inter-latin.woff2",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
  style: "normal",
  fallback: ["Inter", "system-ui", "-apple-system", "sans-serif"],
});

const jetbrainsMono = localFont({
  src: "./fonts/jetbrains-mono-latin.woff2",
  variable: "--font-jetbrains-mono",
  display: "swap",
  weight: "100 800",
  style: "normal",
  fallback: ["JetBrains Mono", "monospace"],
});

export const metadata: Metadata = {
  title: "Meeplix - Gerenciador de Coleção de Board Games",
  description: "Organize e gerencie sua coleção pessoal de jogos de tabuleiro",
  keywords: ["board games", "jogos de tabuleiro", "coleção", "meeplix"],
  authors: [{ name: "Meeplix" }],
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Meeplix - Gerenciador de Coleção de Board Games",
    description: "Organize e gerencie sua coleção pessoal de jogos de tabuleiro",
    type: "website",
    locale: "pt_BR",
    siteName: "Meeplix",
  },
};

export const viewport: Viewport = {
  themeColor: "#2c274b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-background text-on-surface antialiased min-h-screen flex flex-col font-sans text-body-md selection:bg-primary selection:text-on-primary">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}