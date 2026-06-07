/**
 * POST /api/app/admin/cleanup
 * ESC-005: Cleanup automático de logs antigos
 *
 * Remove:
 *   - ActivityLog com mais de 90 dias
 *   - Notification lida com mais de 30 dias
 *
 * Proteção: exclusivo para FRANQUEADORA.
 * Pode ser chamado manualmente via painel ou por cron externo
 * (ex: Vercel Cron Jobs, GitHub Actions agendado).
 *
 * GET  → retorna preview (contagem do que seria removido, sem deletar)
 * POST → executa o cleanup e retorna quantidade removida
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

// GET — preview: quantos registros seriam removidos
export async function GET() {
  try {
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
        where: {
          lida: true,
          createdAt: { lt: corteNotification },
        },
      }),
    ]);

    return NextResponse.json({
      preview: true,
      retencao: {
        activityLog: `${ACTIVITY_LOG_RETENCAO_DIAS} dias`,
        notificacoesLidas: `${NOTIFICATION_LIDA_RETENCAO_DIAS} dias`,
      },
      cortes: {
        activityLog:   corteActivityLog.toISOString().split("T")[0],
        notificacoes:  corteNotification.toISOString().split("T")[0],
      },
      paraRemover: {
        activityLogs:  activityLogsCount,
        notificacoes:  notificacoesCount,
        total:         activityLogsCount + notificacoesCount,
      },
      mensagem: activityLogsCount + notificacoesCount === 0
        ? "Nada a remover — banco está limpo."
        : `${activityLogsCount + notificacoesCount} registro(s) elegíveis para remoção.`,
    });
  } catch (e) {
    return handleApiError(e, "CLEANUP_GET");
  }
}

// POST — executa o cleanup
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "FRANQUEADORA") {
      return NextResponse.json({ error: "Acesso restrito à Franqueadora." }, { status: 403 });
    }

    // Suporte a ?dry_run=true para testar sem deletar
    const { searchParams } = new URL(req.url);
    const dryRun = searchParams.get("dry_run") === "true";

    const { corteActivityLog, corteNotification } = getCortes();

    if (dryRun) {
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

    // Executar deleções em paralelo
    const [activityResult, notificacoesResult] = await Promise.all([
      prisma.activityLog.deleteMany({
        where: { createdAt: { lt: corteActivityLog } },
      }),
      prisma.notification.deleteMany({
        where: {
          lida: true,
          createdAt: { lt: corteNotification },
        },
      }),
    ]);

    const totalRemovido = activityResult.count + notificacoesResult.count;

    console.log(`[CLEANUP] Executado por ${session.user.email} — activityLogs: ${activityResult.count}, notificações: ${notificacoesResult.count}`);

    return NextResponse.json({
      ok: true,
      removidos: {
        activityLogs:  activityResult.count,
        notificacoes:  notificacoesResult.count,
        total:         totalRemovido,
      },
      retencao: {
        activityLog:        `${ACTIVITY_LOG_RETENCAO_DIAS} dias`,
        notificacoesLidas:  `${NOTIFICATION_LIDA_RETENCAO_DIAS} dias`,
      },
      executadoEm: new Date().toISOString(),
      mensagem: totalRemovido === 0
        ? "Banco já estava limpo — nada foi removido."
        : `${totalRemovido} registro(s) removido(s) com sucesso.`,
    });
  } catch (e) {
    return handleApiError(e, "CLEANUP_POST");
  }
}
