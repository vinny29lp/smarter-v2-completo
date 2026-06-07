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
    // Latência real = tempo de 1 round-trip simples (SELECT 1), não de todas as queries
    const dbInicio = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencia = Date.now() - dbInicio;

    // Todas as contagens em 1 único round-trip para minimizar latência de rede
    type MetricasRow = {
      total_users: bigint;
      total_students: bigint;
      total_companies: bigint;
      total_contracts: bigint;
      total_franchises: bigint;
      total_financials: bigint;
      total_vacancies: bigint;
      total_docs: bigint;
      total_activity: bigint;
      total_ai: bigint;
      total_imports: bigint;
      contratos_ativos: bigint;
      estudantes_ativos: bigint;
      ai_hoje: bigint;
      atividade_hoje: bigint;
    };
    const [metricas] = await prisma.$queryRaw<MetricasRow[]>`
      SELECT
        (SELECT COUNT(*)::bigint FROM users)               AS total_users,
        (SELECT COUNT(*)::bigint FROM students)             AS total_students,
        (SELECT COUNT(*)::bigint FROM companies)            AS total_companies,
        (SELECT COUNT(*)::bigint FROM contracts)            AS total_contracts,
        (SELECT COUNT(*)::bigint FROM franchises)           AS total_franchises,
        (SELECT COUNT(*)::bigint FROM financials)           AS total_financials,
        (SELECT COUNT(*)::bigint FROM vacancies)            AS total_vacancies,
        (SELECT COUNT(*)::bigint FROM internship_documents) AS total_docs,
        (SELECT COUNT(*)::bigint FROM activity_logs)        AS total_activity,
        (SELECT COUNT(*)::bigint FROM ai_usage_logs)        AS total_ai,
        (SELECT COUNT(*)::bigint FROM import_logs)          AS total_imports,
        (SELECT COUNT(*)::bigint FROM contracts WHERE status = 'ATIVO') AS contratos_ativos,
        (SELECT COUNT(*)::bigint FROM students s
         WHERE EXISTS (
           SELECT 1 FROM contracts c
           WHERE c."studentId" = s.id AND c.status = 'ATIVO'
         ))                                                 AS estudantes_ativos,
        (SELECT COUNT(*)::bigint FROM ai_usage_logs
         WHERE "createdAt" >= CURRENT_DATE)                 AS ai_hoje,
        (SELECT COUNT(*)::bigint FROM activity_logs
         WHERE "createdAt" >= CURRENT_DATE)                 AS atividade_hoje
    `;

    const totalUsers       = Number(metricas.total_users);
    const totalStudents    = Number(metricas.total_students);
    const totalCompanies   = Number(metricas.total_companies);
    const totalContracts   = Number(metricas.total_contracts);
    const totalFranchises  = Number(metricas.total_franchises);
    const totalFinancials  = Number(metricas.total_financials);
    const totalVacancies   = Number(metricas.total_vacancies);
    const totalDocuments   = Number(metricas.total_docs);
    const totalActivityLogs = Number(metricas.total_activity);
    const totalAiLogs      = Number(metricas.total_ai);
    const totalImportLogs  = Number(metricas.total_imports);
    const contratosAtivos  = Number(metricas.contratos_ativos);
    const estudantesAtivos = Number(metricas.estudantes_ativos);
    const aiUsageHoje      = Number(metricas.ai_hoje);
    const atividadeHoje    = Number(metricas.atividade_hoje);

    // Custo estimado: coluna não existe no DB atual, retorna 0 até migration
    const custoAiHojeTotal = 0;

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
          const hojeStr = new Date().toISOString().slice(0, 10);
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
