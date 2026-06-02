/**
 * audit.ts — Helper de auditoria centralizado
 * Sprint 02 — AUD-001 + AUD-002
 *
 * Registra ações críticas no ActivityLog com usuário, role, franchiseId, IP, ação e recurso.
 * Fire-and-forget: nunca lança exceção para não bloquear a rota principal.
 */

import { prisma } from "@/lib/prisma";

export interface AuditLogOptions {
  userId?: string;
  role?: string;
  franchiseId?: string;
  acao: string;
  modulo: string;
  detalhes?: string;
  ip?: string;
}

/**
 * Extrai o IP real do request considerando proxies (Vercel, Cloudflare, etc.)
 */
export function getClientIP(req: Request): string {
  const headers = req.headers;
  return (
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/**
 * Registra uma ação de auditoria. Fire-and-forget — nunca bloqueia o fluxo principal.
 */
export async function logAudit(opts: AuditLogOptions): Promise<void> {
  try {
    const detalhes = [
      opts.role ? `role:${opts.role}` : null,
      opts.franchiseId ? `franchiseId:${opts.franchiseId}` : null,
      opts.detalhes || null,
    ]
      .filter(Boolean)
      .join(" | ");

    await prisma.activityLog.create({
      data: {
        userId: opts.userId || null,
        acao: opts.acao,
        modulo: opts.modulo,
        detalhes: detalhes || null,
        ip: opts.ip || null,
      },
    });
  } catch {
    // Fire-and-forget: ignora erros de log para não bloquear a rota
  }
}
