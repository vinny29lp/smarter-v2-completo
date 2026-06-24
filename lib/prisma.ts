import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// ⚡ Garantir que a DATABASE_URL tenha connection_limit para Vercel serverless
// Sem isso, Prisma pode abrir múltiplas conexões por invocação, esgotando o pool do Supabase
// M4: PRISMA_POOL_SIZE permite configurar o limite via env (ex: ao migrar para Supabase Pro)
//     Se não definida, mantém connection_limit=1 (comportamento atual — sem regressão)
function buildDatasourceUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return url;
  // connection_limit=3 permite que Promise.all com múltiplas queries rode sem timeout
  // Supabase free tier suporta até 20 conexões diretas; 3 por serverless function é seguro
  const poolSize = process.env.PRISMA_POOL_SIZE || "3";
  // Aumenta o pool_timeout para 30s (padrão 15s era muito curto para queries paralelas)
  const poolTimeout = process.env.PRISMA_POOL_TIMEOUT || "30";
  // Adiciona connection_limit e pool_timeout se não presentes
  const hasLimit = url.includes("connection_limit");
  const hasTimeout = url.includes("pool_timeout");
  const separator = url.includes("?") ? "&" : "?";
  let extra = "";
  if (!hasLimit) extra += `${separator}connection_limit=${poolSize}`;
  if (!hasTimeout) extra += `${extra ? "&" : separator}pool_timeout=${poolTimeout}`;
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
