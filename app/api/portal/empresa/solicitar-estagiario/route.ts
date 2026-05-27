import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "EMPRESA") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  if (!body.titulo || !body.bolsa) {
    return NextResponse.json({ error: "Título e bolsa são obrigatórios." }, { status: 400 });
  }

  // Find the company from session
  const company = await prisma.company.findFirst({
    where: { users: { some: { id: (session.user as any).id } } },
    select: { id: true, name: true, franchiseId: true },
  });

  if (!company) {
    return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
  }

  const mensagem = [
    `Empresa: ${company.name}`,
    `Vaga: ${body.titulo}`,
    body.area ? `Área: ${body.area}` : null,
    body.modalidade ? `Modalidade: ${body.modalidade}` : null,
    `Bolsa: R$ ${Number(body.bolsa).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
    body.horario ? `Horário: ${body.horario}` : null,
    body.cidade ? `Cidade: ${body.cidade}` : null,
    body.descricao ? `Descrição: ${body.descricao}` : null,
    body.requisitos ? `Requisitos: ${body.requisitos}` : null,
    body.observacao ? `Observações: ${body.observacao}` : null,
  ].filter(Boolean).join("\n");

  // Find franchise users to notify (FRANQUEADO + FUNCIONARIO of this franchise, or FRANQUEADORA)
  const franchiseUsers = await prisma.user.findMany({
    where: {
      OR: [
        { role: "FRANQUEADO", franchiseId: company.franchiseId },
        { role: "FUNCIONARIO", franchiseId: company.franchiseId },
        { role: "FRANQUEADORA" },
      ],
    },
    select: { id: true },
  });

  // Create a notification for each franchise user
  if (franchiseUsers.length > 0) {
    await prisma.notification.createMany({
      data: franchiseUsers.map((u) => ({
        userId: u.id,
        titulo: `🎯 Nova Solicitação de Estagiário — ${company.name}`,
        mensagem,
        tipo: "SOLICITACAO_ESTAGIARIO",
        link: `/dashboard/empresas/${company.id}`,
        lida: false,
      })),
    });
  }

  return NextResponse.json({ ok: true });
}
