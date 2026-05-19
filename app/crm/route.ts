import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(req.url);
  const situacao = searchParams.get("situacao") || "ativo";

  const where: any = {
    ...(session?.user?.franchiseId ? { franchiseId: session.user.franchiseId } : {}),
    ...(situacao !== "todos" ? { situacao } : {}),
  };

  const leads = await prisma.crmLead.findMany({
    where,
    include: {
      company: { select: { id: true, name: true } },
      tasks: { where: { done: false }, orderBy: { dueAt: "asc" }, take: 3 },
      notas: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { notas: true, tasks: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ leads });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const body = await req.json();

  const lead = await prisma.crmLead.create({
    data: {
      empresa:        body.empresa,
      contato:        body.contato        || null,
      email:          body.email          || null,
      telefone:       body.telefone       || null,
      proximaAcao:    body.proximaAcao    || null,
      retornoAt:      body.retornoAt      ? new Date(body.retornoAt) : null,
      situacao:       "ativo",
      franchiseId:    session?.user?.franchiseId || "",
    },
    include: {
      tasks: true,
      notas: true,
      _count: { select: { notas: true, tasks: true } },
    },
  });

  // Criar nota inicial se houver observação
  if (body.observacao) {
    await prisma.crmNota.create({
      data: { leadId: lead.id, texto: body.observacao, tipo: "anotacao" },
    });
  }

  return NextResponse.json({ lead });
}
