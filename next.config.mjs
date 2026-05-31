/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // ⚡ Compressão de resposta ativa
  compress: true,
  // ⚡ Headers de cache para assets estáticos (JS/CSS/imagens)
  async headers() {
    return [
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
    // Se a variável de ambiente já estiver definida corretamente, mantém o valor.
    // Se for o placeholder ou estiver ausente, usa a URL de produção.
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
