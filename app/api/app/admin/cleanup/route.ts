/**
 * GET|POST /api/app/admin/cleanup
 * ESC-005: Cleanup automático de logs antigos
 *
 * Remove:
 *   - ActivityLog com mais de 90 dias
 *   - Notification lida com mais de 30 dias
 *
 * Proteção:
 *   - GET/POST sem token: requer Authorization: Bearer <CRON_SECRET>
 *     (chamado pelo Vercel Cron — toda Domingo às 03h00, schedule: "0 3 * * 0")
 *   - GET/POST com sessão: requer role FRANQUEADORA
 *
 * GET  sem token  → executa cleanup (Vercel Cron)
 * GET  com sessão → retorna preview (painel admin)
 * POST com sessão → executa cleanup (painel admin)
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";

// Configurações de retenção
const ACTIVITY_LOG_RETENCAO_DIAS = 90;
const NOTIFICATION_LIDA_RETENCAO_DIAS = 30;

function getCortes() {
  const agora = new Date();
  const corteActivityLog = new Date(agora);
  corteActivityLog.setDate(corteActivityLog.getDate() - ACTIVITY_LOG_RETENCAO_DIAS);

  const corteNotification = new Date(agora);
  corteNotification.setDate(corteNotification.getDate() - NOTIFICATION_LIDA_RETENCAO_DIAS);

  return { corteActivityLog, corteNotification };
}

/** Verifica se a requisição vem do Vercel Cron via CRON_SECRET */
function isCronRequest(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}

/** Executa o cleanup e retorna o resultado — reutilizado pelo cron e pelo painel */
async function runCleanup(trigger: string) {
  const { corteActivityLog, corteNotification } = getCortes();

  const [activityResult, notificacoesResult] = await Promise.all([
    prisma.activityLog.deleteMany({
      where: { createdAt: { lt: corteActivityLog } },
    }),
    prisma.notification.deleteMany({
      where: { lida: true, createdAt: { lt: corteNotification } },
    }),
  ]);

  const totalRemovido = activityResult.count + notificacoesResult.count;
  console.log(`[CLEANUP] Trigger=${trigger} — activityLogs: ${activityResult.count}, notificações: ${notificacoesResult.count}`);

  return {
    ok: true,
    removidos: {
      activityLogs:  activityResult.count,
      notificacoes:  notificacoesResult.count,
      total:         totalRemovido,
    },
    retencao: {
      activityLog:       `${ACTIVITY_LOG_RETENCAO_DIAS} dias`,
      notificacoesLidas: `${NOTIFICATION_LIDA_RETENCAO_DIAS} dias`,
    },
    executadoEm: new Date().toISOString(),
    mensagem: totalRemovido === 0
      ? "Banco já estava limpo — nada foi removido."
      : `${totalRemovido} registro(s) removido(s) com sucesso.`,
  };
}

// GET — Vercel Cron executa; painel exibe preview
export async function GET(req: Request) {
  try {
    // Vercel Cron: Authorization: Bearer <CRON_SECRET> → executa cleanup
    if (isCronRequest(req)) {
      const result = await runCleanup("vercel-cron");
      return NextResponse.json(result);
    }

    // Painel admin: requer sessão FRANQUEADORA → retorna preview
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "FRANQUEADORA") {
      return NextResponse.json({ error: "Acesso restrito à Franqueadora." }, { status: 403 });
    }

    const { corteActivityLog, corteNotification } = getCortes();

    const [activityLogsCount, notificacoesCount] = await Promise.all([
      prisma.activityLog.count({
        where: { createdAt: { lt: corteActivityLog } },
      }),
      prisma.notification.count({
        where: { lida: true, createdAt: { lt: corteNotification } },
      }),
    ]);

    return NextResponse.json({
      preview: true,
      retencao: {
        activityLog:       `${ACTIVITY_LOG_RETENCAO_DIAS} dias`,
        notificacoesLidas: `${NOTIFICATION_LIDA_RETENCAO_DIAS} dias`,
      },
      cortes: {
        activityLog:  corteActivityLog.toISOString().split("T")[0],
        notificacoes: corteNotification.toISOString().split("T")[0],
      },
      paraRemover: {
        activityLogs: activityLogsCount,
        notificacoes: notificacoesCount,
        total:        activityLogsCount + notificacoesCount,
      },
      mensagem: activityLogsCount + notificacoesCount === 0
        ? "Nada a remover — banco está limpo."
        : `${activityLogsCount + notificacoesCount} registro(s) elegíveis para remoção.`,
    });
  } catch (e) {
    return handleApiError(e, "CLEANUP_GET");
  }
}

// POST — executa o cleanup via painel admin
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "FRANQUEADORA") {
      return NextResponse.json({ error: "Acesso restrito à Franqueadora." }, { status: 403 });
    }

    // Suporte a ?dry_run=true para testar sem deletar
    const { searchParams } = new URL(req.url);
    if (searchParams.get("dry_run") === "true") {
      const { corteActivityLog, corteNotification } = getCortes();
      const [activityLogsCount, notificacoesCount] = await Promise.all([
        prisma.activityLog.count({ where: { createdAt: { lt: corteActivityLog } } }),
        prisma.notification.count({ where: { lida: true, createdAt: { lt: corteNotification } } }),
      ]);
      return NextResponse.json({
        dryRun: true,
        removeria: { activityLogs: activityLogsCount, notificacoes: notificacoesCount },
        mensagem: "Dry run — nenhum registro foi removido.",
      });
    }

    const result = await runCleanup(session.user.email || "admin");
    return NextResponse.json(result);
  } catch (e) {
    return handleApiError(e, "CLEANUP_POST");
  }
}
