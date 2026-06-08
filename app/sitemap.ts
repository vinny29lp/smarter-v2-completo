import { MetadataRoute } from "next";

const BASE_URL = "https://smarterestagios.com.br";

/**
 * Sitemap dinâmico gerado pelo Next.js App Router.
 * Acessível em: https://smarterestagios.com.br/sitemap.xml
 *
 * Para adicionar novas páginas públicas, inclua entradas no array abaixo.
 * Prioridade:  1.0 = homepage  |  0.9 = páginas principais  |  0.8 = secundárias
 * changeFrequency: como o Google deve re-rastrear essa URL
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    // ── Página inicial ────────────────────────────────────────────────────
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },

    // ── Páginas de captação / lead ─────────────────────────────────────────
    {
      url: `${BASE_URL}/lead`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },

    // ── Portal empresas ───────────────────────────────────────────────────
    {
      url: `${BASE_URL}/portal-empresa`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },

    // ── Portal estudantes ─────────────────────────────────────────────────
    {
      url: `${BASE_URL}/portal-estudante`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },

    // ── Vagas públicas ────────────────────────────────────────────────────
    {
      url: `${BASE_URL}/vagas`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },

    // ── Cadastro ──────────────────────────────────────────────────────────
    {
      url: `${BASE_URL}/cadastro`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },

    // ── Login ─────────────────────────────────────────────────────────────
    {
      url: `${BASE_URL}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
