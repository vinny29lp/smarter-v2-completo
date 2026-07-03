/**
 * POST /api/public/apresentacao/[token]/evento
 *
 * Recebe eventos de interação da landing page (cliques, scroll, tempo).
 * Chamado via navigator.sendBeacon() do cliente — sem bloquear navegação.
 *
 * Body: { tipo: string; extra?: object }
 *
 * Tipos válidos:
 *   scroll_25 | scroll_50 | scroll_75 | chegou_ao_fim
 *   clicou_whatsapp | clicou_agendamento | clicou_vaga
 *   ping_tempo (extra: { segundos: number })
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularLeadScore, adicionarClique } from "@/lib/crm/lead-score";

export const dynamic = "force-dynamic";

const TIPOS_VALIDOS = new Set([
  "scroll_25", "scroll_50", "scroll_75", "chegou_ao_fim",
  "clicou_whatsapp", "clicou_agendamento", "clicou_vaga",
  "ping_tempo",
]);

export async function POST(
  req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    let body: { tipo: string; extra?: Record<string, any> } = { tipo: "" };
    try { body = await req.json(); } catch {}

    const { tipo, extra } = body;
    if (!tipo || !TIPOS_VALIDOS.has(tipo)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    // Busca o lead pelo token
    const lead = await (prisma as any).crmLead.findUnique({
      where: { apresentacaoToken: token },
      select: {
        id: true,
        empresa: true,
        apresentacaoAcessos: true,
        apresentacaoTempoSeg: true,
        apresentacaoScrollMax: true,
        apresentacaoCliques: true,
        apresentacaoEnviadaEm: true,
        apresentacaoAbertaEm: true,
        franchiseId: true,
      },
    });

    if (!lead) return NextResponse.json({ ok: false }, { status: 404 });

    const ip = req.headers.get("x-forwarded-for") || "desconhecido";
    const userAgent = req.headers.get("user-agent") || "";

    // Registra o evento
    await (prisma as any).apresentacaoEvento.create({
      data: {
        leadId: lead.id,
        token,
        tipo,
        ip,
        userAgent,
        extra: extra ? JSON.stringify(extra) : null,
      },
    });

    // Atualiza métricas no lead
    const updateData: Record<string, any> = {};

    // Scroll máximo
    const scrollMap: Record<string, number> = {
      scroll_25: 25, scroll_50: 50, scroll_75: 75, chegou_ao_fim: 100,
    };
    if (scrollMap[tipo] !== undefined) {
      const novoScroll = Math.max(lead.apresentacaoScrollMax || 0, scrollMap[tipo]);
      if (novoScroll > (lead.apresentacaoScrollMax || 0)) {
        updateData.apresentacaoScrollMax = novoScroll;
      }
    }

    // Ping de tempo (acumula segundos)
    if (tipo === "ping_tempo" && extra?.segundos) {
      updateData.apresentacaoTempoSeg = (lead.apresentacaoTempoSeg || 0) + Math.min(extra.segundos, 35);
    }

    // Cliques rastreados
    if (["clicou_whatsapp", "clicou_agendamento", "clicou_vaga"].includes(tipo)) {
      updateData.apresentacaoCliques = adicionarClique(lead.apresentacaoCliques, tipo);

      // Nota na timeline para cliques relevantes
      const clickLabel: Record<string, string> = {
        clicou_whatsapp:    "📱 Lead clicou no botão de WhatsApp na apresentação",
        clicou_agendamento: "📅 Lead clicou em 'Agendar conversa' na apresentação",
        clicou_vaga:        "🎯 Lead clicou em 'Quero abrir uma vaga' na apresentação",
      };
      try {
        await (prisma as any).crmNota.create({
          data: { leadId: lead.id, texto: clickLabel[tipo], tipo: "anotacao" },
        });

        // Notificação urgente para clique em WhatsApp ou agendamento
        if (["clicou_whatsapp", "clicou_agendamento"].includes(tipo) && lead.franchiseId) {
          const franqUsers = await prisma.user.findMany({
            where: {
              franchiseId: lead.franchiseId,
              role: { in: ["FRANQUEADO", "FUNCIONARIO", "EQUIPE"] as any[] },
              active: true,
            },
            select: { id: true },
          });
          if (franqUsers.length > 0) {
            const nt = tipo === "clicou_whatsapp"
              ? `🔥 ${lead.empresa} clicou para falar com a Smarter!`
              : `📅 ${lead.empresa} quer agendar uma conversa!`;
            const nm = tipo === "clicou_whatsapp"
              ? `${lead.empresa} clicou no botão de WhatsApp na apresentação comercial. Entre em contato agora!`
              : `${lead.empresa} clicou em "Agendar conversa" na apresentação. Ótima oportunidade!`;
            await prisma.notification.createMany({
              data: franqUsers.map(u => ({
                userId: u.id,
                titulo: nt,
                mensagem: nm,
                tipo: "apresentacao",
                link: `/dashboard/crm/${lead.id}`,
              })),
              skipDuplicates: true,
            });
          }
        }
      } catch (e) {
        console.error("[evento] nota/notif error:", e);
      }
    }

    // Recalcula score se houve atualização
    if (Object.keys(updateData).length > 0) {
      const novoTempo = updateData.apresentacaoTempoSeg ?? (lead.apresentacaoTempoSeg || 0);
      const novosCliques = updateData.apresentacaoCliques ?? lead.apresentacaoCliques;
      const novoScore = calcularLeadScore({
        apresentacaoAcessos: lead.apresentacaoAcessos || 0,
        apresentacaoTempoSeg: novoTempo,
        apresentacaoCliques: novosCliques,
        apresentacaoEnviadaEm: lead.apresentacaoEnviadaEm ? new Date(lead.apresentacaoEnviadaEm) : null,
        apresentacaoAbertaEm: lead.apresentacaoAbertaEm ? new Date(lead.apresentacaoAbertaEm) : null,
      });
      updateData.leadScore = novoScore;
      await (prisma as any).crmLead.update({ where: { id: lead.id }, data: updateData });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[apresentacao/evento]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
