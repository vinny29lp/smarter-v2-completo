import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const lead = await prisma.crmLead.findUnique({
    where: { id: params.id },
    include: {
      company: true,
      tasks: { orderBy: { createdAt: "desc" } },
      notas: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ lead });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();

  // Ação especial: adicionar nota ao histórico
  if (body.action === "add_nota") {
    const nota = await prisma.crmNota.create({
      data: {
        leadId: params.id,
        texto: body.texto,
        tipo: body.tipo || "anotacao",
      },
    });
    // Atualizar ultimoContato
    await prisma.crmLead.update({
      where: { id: params.id },
      data: { ultimoContato: new Date(), anotacao: body.texto },
    });
    return NextResponse.json({ nota });
  }

  // Ação especial: marcar como vendido
  if (body.action === "vendido") {
    const lead = await prisma.crmLead.update({
      where: { id: params.id },
      data: { etapa: "fechado", situacao: "vendido", convertido: true, ultimoContato: new Date() },
    });
    await prisma.crmNota.create({
      data: { leadId: params.id, texto: body.observacao || "Lead marcado como VENDIDO.", tipo: "anotacao" },
    });
    return NextResponse.json({ lead });
  }

  // Ação especial: marcar como perdido
  if (body.action === "perdido") {
    const lead = await prisma.crmLead.update({
      where: { id: params.id },
      data: { situacao: "perdido", ultimoContato: new Date() },
    });
    await prisma.crmNota.create({
      data: { leadId: params.id, texto: body.motivo || "Lead marcado como PERDIDO.", tipo: "anotacao" },
    });
    return NextResponse.json({ lead });
  }

  // Ação especial: tirar da trilha (pausar)
  if (body.action === "pausar") {
    const lead = await prisma.crmLead.update({
      where: { id: params.id },
      data: { situacao: "pausado" },
    });
    return NextResponse.json({ lead });
  }

  // Ação especial: reativar
  if (body.action === "reativar") {
    const lead = await prisma.crmLead.update({
      where: { id: params.id },
      data: { situacao: "ativo" },
    });
    return NextResponse.json({ lead });
  }

  // Atualização geral
  const lead = await prisma.crmLead.update({
    where: { id: params.id },
    data: {
      ...(body.etapa          !== undefined ? { etapa: body.etapa }                           : {}),
      ...(body.prioridade     !== undefined ? { prioridade: body.prioridade }                 : {}),
      ...(body.valorNegociado !== undefined ? { valorNegociado: body.valorNegociado ? parseFloat(body.valorNegociado) : null } : {}),
      ...(body.retornoAt      !== undefined ? { retornoAt: body.retornoAt ? new Date(body.retornoAt) : null } : {}),
      ...(body.reuniaoAt      !== undefined ? { reuniaoAt: body.reuniaoAt ? new Date(body.reuniaoAt) : null } : {}),
      ...(body.linkReuniao    !== undefined ? { linkReuniao: body.linkReuniao }               : {}),
      ...(body.enderecoReuniao!== undefined ? { enderecoReuniao: body.enderecoReuniao }       : {}),
      ...(body.proximaAcao    !== undefined ? { proximaAcao: body.proximaAcao }               : {}),
      ...(body.anotacao       !== undefined ? { anotacao: body.anotacao, ultimoContato: new Date() } : {}),
      ...(body.empresa        !== undefined ? { empresa: body.empresa }                       : {}),
      ...(body.contato        !== undefined ? { contato: body.contato }                       : {}),
      ...(body.email          !== undefined ? { email: body.email }                           : {}),
      ...(body.telefone       !== undefined ? { telefone: body.telefone }                     : {}),
      ...(body.cargo          !== undefined ? { cargo: body.cargo }                           : {}),
      ...(body.cidade         !== undefined ? { cidade: body.cidade }                         : {}),
    },
    include: {
      tasks: { orderBy: { createdAt: "desc" } },
      notas: { orderBy: { createdAt: "desc" } },
    },
  });
  return NextResponse.json({ lead });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.crmLead.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
