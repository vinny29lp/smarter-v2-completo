import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/app/equipe/relatorio?data=2026-06-19
 *
 * Retorna relatório diário de atividade de membros da Equipe Smarter.
 * Acesso restrito à FRANQUEADORA.
 *
 * Resposta por membro:
 *   - Dados do usuário
 *   - Horário do primeiro acesso (login) e última atividade do dia
 *   - Duração da janela ativa (última - primeira atividade)
 *   - Lista de ações com timestamp, módulo e descrição
 *   - Contagem por módulo
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Acesso restrito à FRANQUEADORA." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const dataParam = searchParams.get("data"); // "YYYY-MM-DD"

  // Default: hoje no horário de Brasília
  const agora = new Date();
  const dataBase = dataParam ? new Date(dataParam + "T00:00:00-03:00") : new Date(
    agora.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }) + "T00:00:00-03:00"
  );

  const inicioDia = new Date(dataBase);
  inicioDia.setHours(0, 0, 0, 0);
  // Ajusta para UTC (Brasília = UTC-3)
  const inicioUTC = new Date(inicioDia.getTime() + 3 * 60 * 60 * 1000);

  const fimDia = new Date(inicioDia);
  fimDia.setDate(fimDia.getDate() + 1);
  const fimUTC = new Date(fimDia.getTime() + 3 * 60 * 60 * 1000);

  try {
    // 1. Buscar todos os membros EQUIPE ativos
    const membrosEquipe = await prisma.user.findMany({
      where: { role: "EQUIPE", active: true },
      select: {
        id: true, name: true, email: true,
        lastLoginAt: true,
        employee: { select: { cargo: true, permissoes: true } },
      },
      orderBy: { name: "asc" },
    });

    if (membrosEquipe.length === 0) {
      return NextResponse.json({ membros: [], data: dataParam || "hoje" });
    }

    const userIds = membrosEquipe.map(m => m.id);

    // 2. Buscar todas as atividades do dia para esses usuários
    const logs = await prisma.activityLog.findMany({
      where: {
        userId: { in: userIds },
        createdAt: { gte: inicioUTC, lt: fimUTC },
      },
      orderBy: { createdAt: "asc" },
    });

    // 3. Agrupar por usuário
    const logsPorUser: Record<string, typeof logs> = {};
    for (const log of logs) {
      if (!log.userId) continue;
      if (!logsPorUser[log.userId]) logsPorUser[log.userId] = [];
      logsPorUser[log.userId].push(log);
    }

    // 4. Montar relatório por membro
    const membros = membrosEquipe.map(membro => {
      const atividades = logsPorUser[membro.id] || [];

      // Logins do dia
      const logins = atividades.filter(a => a.acao === "LOGIN");

      // Primeira e última atividade
      const primeiraAtividade = atividades[0] ?? null;
      const ultimaAtividade = atividades[atividades.length - 1] ?? null;

      // Janela ativa em minutos
      let janelaAtivaMin: number | null = null;
      if (primeiraAtividade && ultimaAtividade && primeiraAtividade.id !== ultimaAtividade.id) {
        const diff = new Date(ultimaAtividade.createdAt!).getTime() - new Date(primeiraAtividade.createdAt!).getTime();
        janelaAtivaMin = Math.round(diff / 60000);
      }

      // Contagem por módulo (excluindo "auth")
      const porModulo: Record<string, number> = {};
      for (const a of atividades) {
        if (a.modulo && a.modulo !== "auth") {
          porModulo[a.modulo] = (porModulo[a.modulo] || 0) + 1;
        }
      }

      // Ações para o timeline (sem LOGIN duplicados no meio)
      const timeline = atividades.map(a => ({
        id: a.id,
        acao: a.acao,
        modulo: a.modulo,
        detalhes: a.detalhes,
        ip: a.ip,
        horario: a.createdAt,
      }));

      return {
        id: membro.id,
        nome: membro.name,
        email: membro.email,
        cargo: membro.employee?.cargo ?? "Equipe Smarter",
        permissoes: membro.employee?.permissoes ?? [],
        lastLoginAt: membro.lastLoginAt,
        // Dados do dia
        totalLogins: logins.length,
        totalAcoes: atividades.filter(a => a.acao !== "LOGIN").length,
        primeiroAcesso: primeiraAtividade?.createdAt ?? null,
        ultimaAtividade: ultimaAtividade?.createdAt ?? null,
        janelaAtivaMin,
        porModulo,
        timeline,
        ativo: atividades.length > 0,
      };
    });

    // Ordenar: ativos primeiro, depois inativas
    membros.sort((a, b) => Number(b.ativo) - Number(a.ativo));

    return NextResponse.json({
      membros,
      data: dataParam || new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }),
      totalMembros: membros.length,
      totalAtivos: membros.filter(m => m.ativo).length,
      totalAcoes: membros.reduce((s, m) => s + m.totalAcoes, 0),
    });
  } catch (e: any) {
    console.error("[equipe/relatorio] erro:", e);
    return NextResponse.json({ error: "Erro ao gerar relatório." }, { status: 500 });
  }
}
