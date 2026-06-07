import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// ⚡ Garantir que a DATABASE_URL tenha connection_limit=1 para Vercel serverless
// Sem isso, Prisma pode abrir múltiplas conexões por invocação, esgotando o pool do Supabase
function buildDatasourceUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return url;
  // Adiciona connection_limit=1 e pool_timeout=10 se não presentes
  const hasLimit = url.includes("connection_limit");
  const hasTimeout = url.includes("pool_timeout");
  const separator = url.includes("?") ? "&" : "?";
  let extra = "";
  if (!hasLimit) extra += `${separator}connection_limit=1`;
  if (!hasTimeout) extra += `${extra ? "&" : separator}pool_timeout=15`;
  return url + extra;
}

// ⚡ Singleton correto para dev E prod:
//    - Em dev: evita múltiplas instâncias por hot-reload
//    - Em prod (Vercel serverless): reutiliza a instância warm entre requests
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    datasources: {
      db: { url: buildDatasourceUrl() },
    },
  });

// ⚠️ Fix: salvar em globalThis em TODOS os ambientes para reutilizar no warm container
globalForPrisma.prisma = prisma;
