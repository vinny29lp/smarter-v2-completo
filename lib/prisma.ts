import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// ⚡ Singleton correto para dev E prod:
//    - Em dev: evita múltiplas instâncias por hot-reload
//    - Em prod (Vercel serverless): reutiliza a instância warm entre requests
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

// ⚠️ Fix: salvar em globalThis em TODOS os ambientes para reutilizar no warm container
globalForPrisma.prisma = prisma;
