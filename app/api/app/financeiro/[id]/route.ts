import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { logAudit, getClientIP } from "@/lib/audit";
import { authOptions } from "@/lib/auth";
import { handleApiError } from "@/lib/api-response";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
  const session = await getServerSession(authOptions);
  if (!session || !["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO"].includes(session.user.role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const role = session.user.role;
  const franchiseId = session.user.franchiseId;
  // FUNCIONARIO: verificar permissão financeiro
  if (role === "FUNCIONARIO") {
    const permissoes: string[] = (session.user as any)?.permissoes ?? [];
    if (!permissoes.includes("financeiro")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Ownership check: verify the financial record belongs to the user's franchise
  if (role !== "FRANQUEADORA") {
    const record = await prisma.financial.findUnique({ where: { id: params.id }, select: { franchiseId: true } });
    if (!record || record.franchiseId !== franchiseId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

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

  // Audit log
  const acao = body.action === "reverter" ? "FINANCEIRO_REVERTIDO"
    : body.status === "PAGO" ? "FINANCEIRO_BAIXA"
    : body.cancelado ? "FINANCEIRO_CANCELADO"
    : "FINANCEIRO_EDITADO";
  logAudit({
    userId: session.user.id,
    role: role || "",
    franchiseId: franchiseId || undefined,
    acao,
    modulo: "financeiro",
    detalhes: `lancamento:${params.id} | acao:${acao}`,
    ip: getClientIP(req),
  });

  return NextResponse.json({ fin });
  } catch (e) {
    return handleApiError(e, "FINANCEIRO_PATCH_001");
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
  const session = await getServerSession(authOptions);
  if (!session || !["FRANQUEADORA", "FRANQUEADO"].includes(session.user.role || "")) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }
  const role = session.user.role;
  const franchiseId = session.user.franchiseId;

  // Ownership check: verify the financial record belongs to the user's franchise
  if (role !== "FRANQUEADORA") {
    const record = await prisma.financial.findUnique({ where: { id: params.id }, select: { franchiseId: true } });
    if (!record || record.franchiseId !== franchiseId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  await prisma.financial.delete({ where: { id: params.id } });

  // Audit log
  logAudit({
    userId: session.user.id,
    role: role || "",
    franchiseId: franchiseId || undefined,
    acao: "FINANCEIRO_EXCLUIDO",
    modulo: "financeiro",
    detalhes: `lancamento:${params.id}`,
    ip: getClientIP(req),
  });

  return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e, "FINANCEIRO_DELETE_001");
  }
}
