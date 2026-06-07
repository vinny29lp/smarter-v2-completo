import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Sistema Smarter",
  description: "Plataforma de gestão de estágios Smarter Estágios",
  applicationName: "Sistema Smarter",
  appleWebApp: {
    title: "Sistema Smarter",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  themeColor: "#1e3a5f",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // ESC-006: Lê o nonce gerado pelo middleware para propagar ao Next.js runtime.
  // O nonce é gerado por request no middleware.ts e injetado via header x-nonce.
  // Com 'strict-dynamic' no CSP, scripts carregados pelo Next.js rodam sem unsafe-inline.
  const nonce = headers().get("x-nonce") ?? "";

  return (
    <html lang="pt-BR">
      <body>
        <Providers nonce={nonce}>{children}</Providers>
      </body>
    </html>
  );
}
