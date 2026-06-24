/**
 * GET    /api/app/franquia-crm/[id]  — detalhe do lead
 * PATCH  /api/app/franquia-crm/[id]  — atualiza campo ou ação (vendido/perdido)
 * DELETE /api/app/franquia-crm/[id]  — remove lead
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { FRANQUIA_PIPELINE } from "@/lib/crm/franquia-pipeline";
import { nanoid } from "nanoid";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "FRANQUEADORA") return NextResponse.json({ error: "Acesso restrito à Franqueadora" }, { status: 403 });

    const lead = await prisma.franquiaLead.findUnique({
      where: { id: params.id },
      include: {
        notas:   { orderBy: { createdAt: "desc" } },
        tarefas: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!lead) return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    return NextResponse.json({ lead });
  } catch (e) {
    return handleApiError(e, "FRANQUIA_CRM_GET");
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "FRANQUEADORA") return NextResponse.json({ error: "Acesso restrito à Franqueadora" }, { status: 403 });

    const body = await req.json().catch(() => ({}));

    const existing = await prisma.franquiaLead.findUnique({
      where: { id: params.id },
      select: { etapa: true, situacao: true, email: true, optIn: true, nomeCompleto: true },
    });
    if (!existing) return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });

    // Ação especial: marcar vendido
    if (body.action === "vendido") {
      const updated = await prisma.franquiaLead.update({
        where: { id: params.id },
        data: {
          situacao: "vendido",
          etapa: "fechado",
          ultimoContato: new Date(),
          etapaChangedAt: new Date(),
        },
      });
      await prisma.franquiaNota.create({
        data: {
          id: nanoid(),
          leadId: params.id,
          texto: "🏆 Franquia vendida! Contrato assinado.",
          tipo: "etapa",
        },
      });
      return NextResponse.json({ lead: updated });
    }

    // Ação especial: marcar perdido
    if (body.action === "perdido") {
      const updated = await prisma.franquiaLead.update({
        where: { id: params.id },
        data: { situacao: "perdido", ultimoContato: new Date() },
      });
      if (body.motivo) {
        await prisma.franquiaNota.create({
          data: {
            id: nanoid(),
            leadId: params.id,
            texto: `❌ Lead perdido. Motivo: ${body.motivo}`,
            tipo: "alerta",
          },
        });
      }
      return NextResponse.json({ lead: updated });
    }

    // Atualização de campos
    const etapaChanged = body.etapa && body.etapa !== existing.etapa;

    const updated = await prisma.franquiaLead.update({
      where: { id: params.id },
      data: {
        ...(body.etapa         ? { etapa: body.etapa } : {}),
        ...(body.situacao      ? { situacao: body.situacao } : {}),
        ...(body.anotacao      !== undefined ? { anotacao: body.anotacao } : {}),
        ...(body.proximaAcao   !== undefined ? { proximaAcao: body.proximaAcao } : {}),
        ...(body.retornoAt     !== undefined ? { retornoAt: body.retornoAt ? new Date(body.retornoAt) : null } : {}),
        ...(body.nomeCompleto  ? { nomeCompleto: body.nomeCompleto } : {}),
        ...(body.email         !== undefined ? { email: body.email } : {}),
        ...(body.telefone      !== undefined ? { telefone: body.telefone } : {}),
        ...(body.cidade        !== undefined ? { cidade: body.cidade } : {}),
        ...(body.estado        !== undefined ? { estado: body.estado } : {}),
        ...(body.origem        !== undefined ? { origem: body.origem } : {}),
        ...(body.optIn         !== undefined ? { optIn: body.optIn } : {}),
        ...(body.leadFrio      !== undefined ? { leadFrio: body.leadFrio } : {}),
        ...(body.valorInvestimento !== undefined ? { valorInvestimento: body.valorInvestimento } : {}),
        ...(etapaChanged ? { etapaChangedAt: new Date() } : {}),
        updatedAt: new Date(),
      },
    });

    // Registro de mudança de etapa na timeline
    if (etapaChanged) {
      const label = FRANQUIA_PIPELINE[body.etapa]?.label || body.etapa;
      await prisma.franquiaNota.create({
        data: {
          id: nanoid(),
          leadId: params.id,
          texto: `🔄 Etapa atualizada para: ${label}`,
          tipo: "etapa",
        },
      });
    }

    // Nota manual
    if (body.nota) {
      await prisma.franquiaNota.create({
        data: {
          id: nanoid(),
          leadId: params.id,
          texto: body.nota,
          tipo: body.tipoNota || "anotacao",
        },
      });
      await prisma.franquiaLead.update({
        where: { id: params.id },
        data: { ultimoContato: new Date() },
      });
    }

    // Tarefa nova
    if (body.tarefa) {
      await prisma.franquiaTarefa.create({
        data: {
          id: nanoid(),
          leadId: params.id,
          descricao: body.tarefa,
          dueAt: body.tarefaDueAt ? new Date(body.tarefaDueAt) : null,
        },
      });
    }

    // Concluir tarefa
    if (body.concluirTarefaId) {
      await prisma.franquiaTarefa.update({
        where: { id: body.concluirTarefaId },
        data: { done: true },
      });
    }

    return NextResponse.json({ lead: updated });
  } catch (e) {
    return handleApiError(e, "FRANQUIA_CRM_PATCH");
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "FRANQUEADORA") {
      return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
    }

    await prisma.franquiaLead.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e, "FRANQUIA_CRM_DELETE");
  }
}
