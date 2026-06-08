import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { Providers } from "./providers";
import { SchemaOrg } from "@/components/seo/SchemaOrg";

const BASE_URL = "https://smarterestagios.com.br";

export const metadata: Metadata = {
  // ── Título com template para sub-páginas ─────────────────────────────────
  title: {
    default: "Smarter Estágios | Agente de Integração para Empresas e Estudantes",
    template: "%s | Smarter Estágios",
  },

  // ── Descrição principal (160 chars) ──────────────────────────────────────
  description:
    "A Smarter Estágios conecta empresas a estagiários qualificados com agilidade e conformidade legal. Gestão completa de estágios: triagem inteligente, contratos digitais e acompanhamento em tempo real.",

  // ── Keywords ─────────────────────────────────────────────────────────────
  keywords: [
    "estágio",
    "estagiário",
    "agente de integração",
    "gestão de estágios",
    "contratação de estagiários",
    "estágio empresas",
    "plataforma de estágio",
    "lei do estágio",
    "bolsa estágio",
    "vagas de estágio",
    "Smarter Estágios",
    "estágio São Paulo",
    "estágio Brasil",
  ],

  applicationName: "Smarter Estágios",

  // ── Open Graph ────────────────────────────────────────────────────────────
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: BASE_URL,
    siteName: "Smarter Estágios",
    title: "Smarter Estágios | Agente de Integração para Empresas e Estudantes",
    description:
      "Conectamos empresas a estagiários qualificados com agilidade e conformidade legal. Gestão completa: triagem inteligente, contratos digitais e acompanhamento em tempo real.",
    images: [
      {
        url: `${BASE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Smarter Estágios — Agente de Integração",
      },
    ],
  },

  // ── Twitter / X Card ─────────────────────────────────────────────────────
  twitter: {
    card: "summary_large_image",
    title: "Smarter Estágios | Agente de Integração",
    description:
      "Conectamos empresas a estagiários qualificados com agilidade e conformidade legal.",
    images: [`${BASE_URL}/og-image.png`],
  },

  // ── Robots ───────────────────────────────────────────────────────────────
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // ── Canonical ────────────────────────────────────────────────────────────
  alternates: {
    canonical: BASE_URL,
  },

  // ── Verificação Google Search Console ────────────────────────────────────
  // Acesse https://search.google.com/search-console → Adicionar propriedade →
  // escolha "Prefixo de URL" → método "Tag HTML" → copie o conteúdo do atributo content
  verification: {
    google: "COLE_SEU_CODIGO_AQUI",
  },

  // ── PWA / Apple ───────────────────────────────────────────────────────────
  appleWebApp: {
    title: "Smarter Estágios",
    statusBarStyle: "default",
  },

  // ── Ícones ────────────────────────────────────────────────────────────────
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
      <head>
        <SchemaOrg />
      </head>
      <body>
        <Providers nonce={nonce}>{children}</Providers>
      </body>
    </html>
  );
}
