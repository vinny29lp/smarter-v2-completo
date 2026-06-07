import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function semaforo(valor: number, warn: number, crit: number): "verde" | "amarelo" | "vermelho" {
  if (valor >= crit) return "vermelho";
  if (valor >= warn) return "amarelo";
  return "verde";
}

function semaforoInverso(valor: number, warn: number, crit: number): "verde" | "amarelo" | "vermelho" {
  // Para métricas onde valor alto é bom (ex: score)
  if (valor <= crit) return "vermelho";
  if (valor <= warn) return "amarelo";
  return "verde";
}

// ─── GET /api/app/saude ───────────────────────────────────────────────────────
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = session.user.role || "";
    if (role !== "FRANQUEADORA") {
      return NextResponse.json({ error: "Acesso restrito à FRANQUEADORA." }, { status: 403 });
    }

    const inicio = Date.now();

    // ── 1. Supabase / Banco ─────────────────────────────────────────────────
    const dbInicio = Date.now();
    const [
      totalUsers,
      totalStudents,
      totalCompanies,
      totalContracts,
      totalFranchises,
      totalFinancials,
      totalVacancies,
      totalDocuments,
      totalAiLogs,
      totalImportLogs,
      totalActivityLogs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.student.count(),
      prisma.company.count(),
      prisma.contract.count(),
      prisma.franchise.count(),
      prisma.financial.count(),
      prisma.vacancy.count(),
      prisma.internshipDocument.count(),
      prisma.aIUsageLog.count(),
      prisma.importLog.count(),
      prisma.activityLog.count(),
    ]);
    const dbLatencia = Date.now() - dbInicio;

    // Contratos ativos
    const contratosAtivos = await prisma.contract.count({
      where: { status: { in: ["ATIVO", "EM_ANDAMENTO"] } },
    });

    // Estudantes ativos (com contrato ativo)
    const estudantesAtivos = await prisma.student.count({
      where: {
        contracts: {
          some: { status: { in: ["ATIVO", "EM_ANDAMENTO"] } },
        },
      },
    });

    // Uso de IA hoje
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const [aiUsageHoje, aiCustoHoje] = await Promise.all([
      prisma.aIUsageLog.count({
        where: { createdAt: { gte: hoje } },
      }),
      prisma.aIUsageLog.findMany({
        where: { createdAt: { gte: hoje } },
        select: { cost: true },
      }),
    ]);
    const custoAiHojeTotal = aiCustoHoje.reduce(
      (acc: number, l: { cost: number | null }) => acc + (l.cost ?? 0),
      0
    );

    // Logs de atividade hoje
    const atividadeHoje = await prisma.activityLog.count({
      where: { createdAt: { gte: hoje } },
    });

    // ── 2. Vercel (via API pública) ─────────────────────────────────────────
    let vercelDeploy = {
      estado: "desconhecido" as string,
      ultimoDeploy: null as string | null,
      buildStatus: "unknown" as string,
      url: null as string | null,
    };

    const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
    const VERCEL_PROJECT = process.env.VERCEL_PROJECT_ID || "smarter-v2-completo";

    if (VERCEL_TOKEN) {
      try {
        const resp = await fetch(
          `https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT}&limit=1&target=production`,
          {
            headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
            signal: AbortSignal.timeout(5000),
          }
        );
        if (resp.ok) {
          const data = await resp.json();
          const dep = data.deployments?.[0];
          if (dep) {
            vercelDeploy = {
              estado: dep.state || "unknown",
              ultimoDeploy: dep.created ? new Date(dep.created).toISOString() : null,
              buildStatus: dep.readyState || dep.state || "unknown",
              url: dep.url ? `https://${dep.url}` : null,
            };
          }
        }
      } catch {
        // Vercel API indisponível — continuar sem
      }
    }

    // ── 3. Email (Resend) ───────────────────────────────────────────────────
    let emailStats = {
      enviadosHoje: 0,
      falhasHoje: 0,
      fila: 0,
    };

    const RESEND_KEY = process.env.RESEND_API_KEY;
    if (RESEND_KEY) {
      try {
        const resp = await fetch("https://api.resend.com/emails?limit=100", {
          headers: { Authorization: `Bearer ${RESEND_KEY}` },
          signal: AbortSignal.timeout(5000),
        });
        if (resp.ok) {
          const data = await resp.json();
          const emails = data.data || [];
          const hojeStr = hoje.toISOString().slice(0, 10);
          emailStats.enviadosHoje = emails.filter(
            (e: { created_at: string; last_event: string }) =>
              e.created_at?.slice(0, 10) === hojeStr && e.last_event !== "bounced"
          ).length;
          emailStats.falhasHoje = emails.filter(
            (e: { created_at: string; last_event: string }) =>
              e.created_at?.slice(0, 10) === hojeStr && e.last_event === "bounced"
          ).length;
        }
      } catch {
        // Resend API indisponível — continuar sem
      }
    }

    // ── 4. Alertas & Semáforos ──────────────────────────────────────────────
    // Thresholds: 70% warn, 90% crit para capacidade
    const LIMITE_ESTUDANTES_WARN = 7000;
    const LIMITE_ESTUDANTES_CRIT = 9000;
    const LIMITE_CONTRATOS_WARN = 3500;
    const LIMITE_CONTRATOS_CRIT = 4500;
    const LIMITE_LATENCIA_WARN = 300;  // ms
    const LIMITE_LATENCIA_CRIT = 800;  // ms

    const alertas: {
      nivel: "verde" | "amarelo" | "vermelho";
      categoria: string;
      mensagem: string;
    }[] = [];

    const semaforoDb = semaforo(dbLatencia, LIMITE_LATENCIA_WARN, LIMITE_LATENCIA_CRIT);
    if (semaforoDb !== "verde") {
      alertas.push({
        nivel: semaforoDb,
        categoria: "Banco de Dados",
        mensagem: `Latência do banco: ${dbLatencia}ms ${semaforoDb === "vermelho" ? "(CRÍTICO)" : "(ATENÇÃO)"}`,
      });
    }

    const semaforoEstudantes = semaforo(totalStudents, LIMITE_ESTUDANTES_WARN, LIMITE_ESTUDANTES_CRIT);
    if (semaforoEstudantes !== "verde") {
      alertas.push({
        nivel: semaforoEstudantes,
        categoria: "Capacidade",
        mensagem: `${totalStudents.toLocaleString("pt-BR")} estudantes cadastrados — considere otimização`,
      });
    }

    const semaforoContratos = semaforo(contratosAtivos, LIMITE_CONTRATOS_WARN, LIMITE_CONTRATOS_CRIT);
    if (semaforoContratos !== "verde") {
      alertas.push({
        nivel: semaforoContratos,
        categoria: "Contratos Ativos",
        mensagem: `${contratosAtivos} contratos ativos — verificar capacidade`,
      });
    }

    if (emailStats.falhasHoje > 5) {
      alertas.push({
        nivel: emailStats.falhasHoje > 20 ? "vermelho" : "amarelo",
        categoria: "Email",
        mensagem: `${emailStats.falhasHoje} falhas de envio de email hoje`,
      });
    }

    if (custoAiHojeTotal > 5) {
      alertas.push({
        nivel: custoAiHojeTotal > 20 ? "vermelho" : "amarelo",
        categoria: "OpenAI",
        mensagem: `Custo IA hoje: USD ${custoAiHojeTotal.toFixed(2)} — monitorar consumo`,
      });
    }

    // ── 5. Score geral de saúde ─────────────────────────────────────────────
    let score = 100;
    if (dbLatencia > LIMITE_LATENCIA_CRIT) score -= 30;
    else if (dbLatencia > LIMITE_LATENCIA_WARN) score -= 10;
    if (emailStats.falhasHoje > 20) score -= 20;
    else if (emailStats.falhasHoje > 5) score -= 5;
    if (custoAiHojeTotal > 20) score -= 15;
    else if (custoAiHojeTotal > 5) score -= 5;
    if (vercelDeploy.buildStatus === "ERROR") score -= 25;
    score = Math.max(0, score);

    const tempoTotal = Date.now() - inicio;

    // ── Resposta ────────────────────────────────────────────────────────────
    return NextResponse.json({
      sucesso: true,
      timestamp: new Date().toISOString(),
      tempoRespostaMs: tempoTotal,
      scoreGeral: score,

      banco: {
        latenciaMs: dbLatencia,
        semaforo: semaforoDb,
        totalUsuarios: totalUsers,
        totalEstudantes: totalStudents,
        estudantesAtivos,
        totalEmpresas: totalCompanies,
        totalContratos: totalContracts,
        contratosAtivos,
        totalFranquias: totalFranchises,
        totalFinanceiros: totalFinancials,
        totalVagas: totalVacancies,
        totalDocumentos: totalDocuments,
        totalActivityLogs,
        totalImportLogs,
        totalAiLogs,
      },

      vercel: {
        semaforo:
          vercelDeploy.buildStatus === "READY" || vercelDeploy.buildStatus === "unknown"
            ? "verde"
            : vercelDeploy.buildStatus === "ERROR"
            ? "vermelho"
            : "amarelo",
        estado: vercelDeploy.estado,
        buildStatus: vercelDeploy.buildStatus,
        ultimoDeploy: vercelDeploy.ultimoDeploy,
        url: vercelDeploy.url,
        disponivel: !!VERCEL_TOKEN,
      },

      email: {
        semaforo:
          emailStats.falhasHoje > 20
            ? "vermelho"
            : emailStats.falhasHoje > 5
            ? "amarelo"
            : "verde",
        enviadosHoje: emailStats.enviadosHoje,
        falhasHoje: emailStats.falhasHoje,
        fila: emailStats.fila,
        disponivel: !!RESEND_KEY,
      },

      openai: {
        semaforo:
          custoAiHojeTotal > 20
            ? "vermelho"
            : custoAiHojeTotal > 5
            ? "amarelo"
            : "verde",
        chamadasHoje: aiUsageHoje,
        custoEstimadoUSDHoje: parseFloat(custoAiHojeTotal.toFixed(4)),
        atividadeHoje,
      },

      alertas,
    });
  } catch (e) {
    return handleApiError(e, "SAUDE_GET_001", "Erro ao carregar métricas de saúde do sistema.");
  }
}
