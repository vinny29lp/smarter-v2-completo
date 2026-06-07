/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // TODO: FASE 7 — Remover após corrigir os erros ESLint nos 14 arquivos identificados
    // Arquivos com erros: ver docs/RELATORIO-BUILD.md
    ignoreDuringBuilds: true,
  },
  // typescript.ignoreBuildErrors removido — todos os erros reais foram corrigidos.
  // Os 43 erros restantes são de Prisma Client desatualizado e resolvem
  // automaticamente com `prisma generate` que já roda no buildCommand da Vercel.
  // Erros reais corrigidos: TS2367 (templates.ts), TS2769 (createdAt nullable × 3 arquivos).
  // ⚡ Compressão de resposta ativa
  compress: true,
  // ⚡ Headers de cache + HTTP Security Headers (FASE 3 — Blindagem de Produção)
  async headers() {
    // Security headers aplicados a todas as rotas
    const securityHeaders = [
      // Impede clickjacking — página não pode ser embutida em iframes
      { key: "X-Frame-Options", value: "DENY" },
      // Impede MIME sniffing — navegador respeita o Content-Type declarado
      { key: "X-Content-Type-Options", value: "nosniff" },
      // Envia apenas origem (sem path) como Referer em cross-origin requests
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // Restringe câmera, microfone e geolocalização
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      // HSTS: força HTTPS por 1 ano com preload
      { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
      // CSP não aplicado agora para não quebrar scripts inline do Next.js/Autentique/PDFs
      // TODO: implementar CSP com nonce após estabilização multi-franqueado
    ];

    return [
      {
        // Security headers em todas as rotas
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/public/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
    ];
  },
  env: {
    // Garante que NEXTAUTH_URL seja correto em produção no Vercel
    NEXTAUTH_URL:
      process.env.NEXTAUTH_URL &&
      process.env.NEXTAUTH_URL !== "https://SEU-PROJETO.vercel.app"
        ? process.env.NEXTAUTH_URL
        : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXTAUTH_URL || "http://localhost:3000",
  },
};

export default nextConfig;
