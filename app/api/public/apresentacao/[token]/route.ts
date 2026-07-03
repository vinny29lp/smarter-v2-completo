/**
 * GET /api/public/apresentacao/[token]
 *
 * Endpoint público chamado quando o lead abre a apresentação comercial.
 * Registra o evento de abertura, atualiza métricas e calcula o lead score.
 * Retorna dados do lead e da franquia para personalizar a landing.
 *
 * Não requer autenticação (a URL com token é o "ingresso").
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularLeadScore, adicionarClique } from "@/lib/crm/lead-score";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    if (!token) return NextResponse.json({ error: "Token inválido" }, { status: 400 });

    // Busca o lead pelo token
    const lead = await (prisma as any).crmLead.findUnique({
      where: { apresentacaoToken: token },
      select: {
        id: true,
        empresa: true,
        contato: true,
        setor: true,
        cidade: true,
        uf: true,
        apresentacaoAcessos: true,
        apresentacaoTempoSeg: true,
        apresentacaoScrollMax: true,
        apresentacaoCliques: true,
        apresentacaoEnviadaEm: true,
        apresentacaoAbertaEm: true,
        franchiseId: true,
      },
    });

    if (!lead) return NextResponse.json({ error: "Apresentação não encontrada" }, { status: 404 });

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "desconhecido";
    const userAgent = req.headers.get("user-agent") || "";
    const agora = new Date();

    const isFirstOpen = !lead.apresentacaoAbertaEm;
    const novosAcessos = (lead.apresentacaoAcessos || 0) + 1;

    // Atualiza métricas de abertura
    await (prisma as any).crmLead.update({
      where: { id: lead.id },
      data: {
        apresentacaoAcessos: novosAcessos,
        apresentacaoAbertaEm: isFirstOpen ? agora : lead.apresentacaoAbertaEm,
        ultimoContato: agora,
        // Recalcula score com acessos atualizados
        leadScore: calcularLeadScore({
          apresentacaoAcessos: novosAcessos,
          apresentacaoTempoSeg: lead.apresentacaoTempoSeg || 0,
          apresentacaoCliques: lead.apresentacaoCliques,
          apresentacaoEnviadaEm: lead.apresentacaoEnviadaEm ? new Date(lead.apresentacaoEnviadaEm) : null,
          apresentacaoAbertaEm: isFirstOpen ? agora : new Date(lead.apresentacaoAbertaEm!),
        }),
      },
    });

    // Registra evento na tabela de eventos
    await (prisma as any).apresentacaoEvento.create({
      data: {
        leadId: lead.id,
        token,
        tipo: "abriu",
        ip,
        userAgent,
      },
    });

    // Nota na timeline (apenas no primeiro acesso ou a cada novo acesso após o primeiro)
    const textoNota = isFirstOpen
      ? `👁️ Lead abriu a apresentação comercial pela primeira vez`
      : `👁️ Lead acessou a apresentação novamente (total: ${novosAcessos}x)`;

    await (prisma as any).crmNota.create({
      data: {
        leadId: lead.id,
        texto: textoNota,
        tipo: "anotacao",
      },
    });

    // Notificação para todos os usuários da unidade responsável pelo lead
    if (lead.franchiseId) {
      try {
        const franqUsers = await prisma.user.findMany({
          where: {
            franchiseId: lead.franchiseId,
            role: { in: ["FRANQUEADO", "FUNCIONARIO", "EQUIPE"] as any[] },
            active: true,
          },
          select: { id: true },
        });
        if (franqUsers.length > 0) {
          const titulo = isFirstOpen
            ? `🔥 Lead quente: ${lead.empresa} abriu a apresentação!`
            : `👁️ ${lead.empresa} acessou a apresentação novamente (${novosAcessos}x)`;
          const mensagem = isFirstOpen
            ? `A empresa ${lead.empresa} abriu sua apresentação comercial. Ótimo momento para fazer follow-up!`
            : `${lead.empresa} acessou a apresentação ${novosAcessos} vezes. Considere entrar em contato agora.`;

          await prisma.notification.createMany({
            data: franqUsers.map(u => ({
              userId: u.id,
              titulo,
              mensagem,
              tipo: "apresentacao",
              link: `/dashboard/crm/${lead.id}`,
            })),
            skipDuplicates: true,
          });
        }
      } catch (e) {
        console.error("[apresentacao] notif error:", e);
      }
    }

    // Busca dados da franquia para personalizar a landing
    let franquia = null;
    if (lead.franchiseId) {
      franquia = await prisma.franchise.findUnique({
        where: { id: lead.franchiseId },
        select: {
          name: true,
          responsavel: true,
          email: true,
          telefone: true,
          whatsapp: true,
          instagram: true,
          cidade: true,
          uf: true,
        },
      }) as any;
    }

    return NextResponse.json({
      ok: true,
      lead: {
        empresa: lead.empresa,
        contato: lead.contato,
        cidade: lead.cidade || franquia?.cidade,
        uf: lead.uf || franquia?.uf,
      },
      franquia: franquia ? {
        nome: franquia.name,
        responsavel: franquia.responsavel,
        whatsapp: franquia.whatsapp || franquia.telefone,
        instagram: franquia.instagram,
        email: franquia.email,
        cidade: franquia.cidade,
        uf: franquia.uf,
      } : null,
    });
  } catch (e) {
    console.error("[apresentacao/GET]", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
