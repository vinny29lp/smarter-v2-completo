import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Motor de Sugestões Inteligentes de Marketing
// Analisa dados da plataforma e gera sugestões personalizadas por unidade

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO"].includes(session.user.role)) {
    return NextResponse.json({ error: "Sem acesso." }, { status: 403 });
  }

  const role = session.user.role;
  const franchiseId = (session.user as any).franchiseId || null;

  try {
    const hoje = new Date();
    const sugestoes: any[] = [];

    // ─── Sugestão 1: Datas comemorativas nos próximos 15 dias ───────────────
    const db = prisma as any;
    const datas = await db.marketingCalendario.findMany({
      where: {
        tipo: "DATA_COMEMORATIVA",
        data: {
          gte: hoje,
          lte: new Date(hoje.getTime() + 15 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { data: "asc" },
      take: 5,
    });
    for (const d of datas) {
      const diasRestantes = Math.ceil((new Date(d.data).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      sugestoes.push({
        id: `data_${d.id}`,
        tipo: "DATA_COMEMORATIVA",
        titulo: `📅 ${d.titulo} em ${diasRestantes} dia${diasRestantes !== 1 ? "s" : ""}`,
        descricao: `Prepare conteúdo temático para o ${d.titulo}. Poste com antecedência para maior alcance.`,
        prioridade: diasRestantes <= 3 ? "ALTA" : "MEDIA",
        acao: "Ver conteúdos temáticos",
        link: "/dashboard/marketing/biblioteca?categoria=datas",
        cor: d.cor || "#F4B400",
      });
    }

    // ─── Sugestão 2: Vagas abertas sem candidatos (convite para divulgar) ───
    if (franchiseId || role === "FRANQUEADO") {
      const vagasSemCandidatos = await prisma.vacancy.count({
        where: {
          franchiseId: franchiseId || "",
          status: "ABERTA",
          applications: { none: {} },
          createdAt: { lte: new Date(hoje.getTime() - 3 * 24 * 60 * 60 * 1000) },
        },
      });
      if (vagasSemCandidatos > 0) {
        sugestoes.push({
          id: "vagas_sem_candidatos",
          tipo: "DIVULGACAO_VAGA",
          titulo: `🎯 ${vagasSemCandidatos} vaga${vagasSemCandidatos > 1 ? "s" : ""} sem candidatos`,
          descricao: "Você tem vagas abertas há mais de 3 dias sem inscrições. Divulgue nas redes sociais para atrair candidatos!",
          prioridade: "ALTA",
          acao: "Ver templates de vaga",
          link: "/dashboard/marketing/biblioteca?categoria=recrutamento",
          cor: "#ef4444",
        });
      }
    }

    // ─── Sugestão 3: Novos contratos — post de boas-vindas ──────────────────
    if (franchiseId || role === "FRANQUEADO") {
      const novosContratos = await prisma.contract.count({
        where: {
          franchiseId: franchiseId || "",
          status: "ATIVO",
          createdAt: { gte: new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000) },
        },
      });
      if (novosContratos > 0) {
        sugestoes.push({
          id: "novos_contratos",
          tipo: "POS_CONTRATO",
          titulo: `🤝 ${novosContratos} novo${novosContratos > 1 ? "s" : ""} contrato${novosContratos > 1 ? "s" : ""} essa semana`,
          descricao: "Publique um post de boas-vindas ao(s) novo(s) parceiro(s) para fortalecer a imagem da sua unidade.",
          prioridade: "MEDIA",
          acao: "Ver templates de parceria",
          link: "/dashboard/marketing/biblioteca?categoria=comercial",
          cor: "#22c55e",
        });
      }
    }

    // ─── Sugestão 4: Leads sem follow-up (CRM) ──────────────────────────────
    if (franchiseId || role === "FRANQUEADO") {
      const leadsParados = await prisma.crmLead.count({
        where: {
          franchiseId: franchiseId || "",
          situacao: "ativo",
          ultimoContato: { lte: new Date(hoje.getTime() - 5 * 24 * 60 * 60 * 1000) },
        },
      });
      if (leadsParados > 0) {
        sugestoes.push({
          id: "leads_parados",
          tipo: "REENGAJAMENTO",
          titulo: `💼 ${leadsParados} lead${leadsParados > 1 ? "s" : ""} sem contato há 5+ dias`,
          descricao: "Envie um conteúdo de valor (artigo, case, depoimento) para reengajar leads que esfriaram.",
          prioridade: "MEDIA",
          acao: "Ver conteúdos de reengajamento",
          link: "/dashboard/marketing/biblioteca?categoria=comercial",
          cor: "#f59e0b",
        });
      }
    }

    // ─── Sugestão 5: Post semanal recomendado ───────────────────────────────
    const diaSemana = hoje.getDay(); // 0=dom, 1=seg...
    if (diaSemana === 1) { // Segunda-feira
      sugestoes.push({
        id: "post_semanal_segunda",
        tipo: "CALENDARIO",
        titulo: "📸 Segunda-feira: Dica de carreira",
        descricao: "Segunda é o melhor dia para posts educativos. Publique uma dica de carreira para estudantes e reforce a marca Smarter.",
        prioridade: "BAIXA",
        acao: "Ver conteúdos educativos",
        link: "/dashboard/marketing/biblioteca?categoria=recrutamento",
        cor: "#0D2B5C",
      });
    } else if (diaSemana === 3) { // Quarta-feira
      sugestoes.push({
        id: "post_semanal_quarta",
        tipo: "CALENDARIO",
        titulo: "🏆 Quarta-feira: Depoimento de parceiro",
        descricao: "Quarta tem bom engajamento para posts de prova social. Compartilhe um depoimento de empresa parceira.",
        prioridade: "BAIXA",
        acao: "Ver templates de depoimento",
        link: "/dashboard/marketing/biblioteca?categoria=comercial",
        cor: "#0D2B5C",
      });
    } else if (diaSemana === 5) { // Sexta-feira
      sugestoes.push({
        id: "post_semanal_sexta",
        tipo: "CALENDARIO",
        titulo: "🎉 Sexta-feira: Post de resultado",
        descricao: "Sexta é ótima para posts de resultados e conquistas da semana. Mostre o impacto da sua unidade!",
        prioridade: "BAIXA",
        acao: "Ver templates de resultado",
        link: "/dashboard/marketing/biblioteca?categoria=rede",
        cor: "#0D2B5C",
      });
    }

    // Ordenar por prioridade
    const ordemPrioridade: Record<string, number> = { ALTA: 0, MEDIA: 1, BAIXA: 2 };
    sugestoes.sort((a, b) => ordemPrioridade[a.prioridade] - ordemPrioridade[b.prioridade]);

    return NextResponse.json({ sugestoes });
  } catch (e: any) {
    console.error("[marketing/sugestoes] GET:", e?.message);
    return NextResponse.json({ sugestoes: [], error: "Erro ao gerar sugestões." }, { status: 200 });
  }
}
