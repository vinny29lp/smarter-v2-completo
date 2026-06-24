/**
 * GET /api/app/crm/sla-check
 *
 * Varre todos os leads ativos com SLA vencido e:
 *  1. Cria uma CrmTask [SLA] se ainda não existir tarefa aberta com esse prefixo.
 *  2. Adiciona uma CrmNota de alerta na timeline do lead.
 *  3. Para leads com SLA vencido há mais de 48h ("escalados"), adiciona nota de escalada.
 *
 * Retorna: { breached, escalated, tasksCreated }
 * Acesso: FRANQUEADORA, FRANQUEADO, FUNCIONARIO.
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { SLA_CONFIG, diasNaEtapa } from "@/lib/crm/sla-config";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role || "";
  const franchiseId = session.user.franchiseId;

  if (!["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Filtro de franquia (mesmo padrão do CRM GET)
  const franchiseFilter =
    role === "FRANQUEADORA"
      ? { franchiseId: null }
      : { franchiseId: franchiseId ?? "" };

  try {
    // Busca todos os leads ativos com etapa que tem SLA
    const leads = await prisma.crmLead.findMany({
      where: {
        ...franchiseFilter,
        situacao: "ativo",
        etapa: { in: Object.keys(SLA_CONFIG).filter(k => SLA_CONFIG[k].diasMax > 0) },
      },
      include: {
        tasks: {
          where: { done: false, descricao: { startsWith: "[SLA]" } },
          take: 1,
        },
      },
    });

    let breached = 0;
    let escalated = 0;
    let tasksCreated = 0;

    for (const lead of leads) {
      const cfg = SLA_CONFIG[lead.etapa || ""];
      if (!cfg || cfg.diasMax === 0) continue;

      const dias = diasNaEtapa((lead as any).etapaChangedAt);
      if (dias < cfg.diasMax) continue; // SLA ainda válido

      breached++;
      const diasVencido = dias - cfg.diasMax;
      const isEscalado = diasVencido >= 2; // 48h+ além do vencimento

      if (isEscalado) escalated++;

      // Só cria task se não há nenhuma aberta com [SLA] para este lead
      const temTaskSla = lead.tasks.length > 0;
      if (!temTaskSla) {
        const dueAt = new Date(); // urgente: vence hoje
        await prisma.crmTask.create({
          data: {
            leadId: lead.id,
            descricao: isEscalado
              ? `[SLA] ⚠️ ESCALADO — lead parado há ${dias} dias em "${cfg.label}" (limite: ${cfg.diasMax}d). Ação imediata necessária.`
              : `[SLA] Lead parado há ${dias} dia${dias > 1 ? "s" : ""} em "${cfg.label}" (limite: ${cfg.diasMax}d). Entrar em contato.`,
            dueAt,
          },
        });
        tasksCreated++;

        // Nota na timeline
        await prisma.crmNota.create({
          data: {
            leadId: lead.id,
            texto: isEscalado
              ? `🚨 SLA ESCALADO — empresa ${lead.empresa} está parada há ${dias} dias na etapa "${cfg.label}". Limite era de ${cfg.diasMax} dias. Gestor notificado.`
              : `⏰ SLA vencido — empresa ${lead.empresa} está há ${dias} dias na etapa "${cfg.label}" (limite: ${cfg.diasMax} dias). Tarefa criada automaticamente.`,
            tipo: "alerta",
          },
        });
      }
    }

    return NextResponse.json({ breached, escalated, tasksCreated });
  } catch (e: any) {
    console.error("[crm/sla-check] error:", e?.message || e);
    return NextResponse.json({ error: "Erro ao verificar SLA." }, { status: 500 });
  }
}
