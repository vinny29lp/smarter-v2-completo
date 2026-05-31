import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO"].includes(session.user.role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const role = session.user.role;

  // Reverter baixa
  if (body.action === "reverter") {
    // Só FRANQUEADORA pode reverter baixa em cobranças de Franquia
    const existing = await prisma.financial.findUnique({ where: { id: params.id }, select: { categoria: true } });
    if (existing?.categoria === "Franquia" && role !== "FRANQUEADORA") {
      return NextResponse.json({ error: "Apenas a Franqueadora pode reverter cobranças de rede." }, { status: 403 });
    }
    const fin = await prisma.financial.update({
      where: { id: params.id },
      data: { status: "PENDENTE", paidAt: null },
    });
    return NextResponse.json({ fin });
  }

  // Dar baixa (status PAGO) em cobranças de Franquia: apenas FRANQUEADORA
  if (body.status === "PAGO") {
    const existing = await prisma.financial.findUnique({ where: { id: params.id }, select: { categoria: true } });
    if (existing?.categoria === "Franquia" && role !== "FRANQUEADORA") {
      return NextResponse.json({ error: "Apenas a Franqueadora pode confirmar o pagamento de cobranças de rede." }, { status: 403 });
    }
  }

  const fin = await prisma.financial.update({
    where: { id: params.id },
    data: {
      ...(body.status ? { status: body.status as any } : {}),
      ...(body.paidAt ? { paidAt: new Date(body.paidAt) } : {}),
      ...(body.descricao ? { descricao: body.descricao } : {}),
      ...(body.valor ? { valor: parseFloat(body.valor) } : {}),
      ...(body.cancelado !== undefined ? { cancelado: body.cancelado, status: body.cancelado ? "CANCELADO" as any : undefined } : {}),
    },
  });
  return NextResponse.json({ fin });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !["FRANQUEADORA", "FRANQUEADO"].includes(session.user.role || "")) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }
  await prisma.financial.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
