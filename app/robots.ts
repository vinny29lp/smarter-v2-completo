import { MetadataRoute } from "next";

/**
 * Robots.txt dinâmico gerado pelo Next.js App Router.
 * Acessível em: https://smarterestagios.com.br/robots.txt
 *
 * Bloqueia rotas privadas (/api/, /app/, /admin/, /dashboard/)
 * e libera tudo mais para indexação pelo Google.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/app/",
          "/admin/",
          "/dashboard/",
          "/portal-empresa/",
          "/portal-estudante/",
        ],
      },
      // Bloqueia GPTBot e outros crawlers de IA para não consumir conteúdo sem permissão
      {
        userAgent: "GPTBot",
        disallow: "/",
      },
      {
        userAgent: "CCBot",
        disallow: "/",
      },
    ],
    sitemap: "https://smarterestagios.com.br/sitemap.xml",
    host: "https://smarterestagios.com.br",
  };
}
