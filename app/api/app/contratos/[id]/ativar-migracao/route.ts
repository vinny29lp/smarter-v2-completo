import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
  const session = await getServerSession(authOptions);
  const allowedRoles = ["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO"];
  if (!session || !allowedRoles.includes(session.user.role || "")) {
    return NextResponse.json({ error: "Sem permissão para ativar estágio." }, { status: 403 });
  }

  const contrato = await prisma.contract.findUnique({ where: { id: params.id } });
  if (!contrato) {
    return NextResponse.json({ error: "Contrato não encontrado." }, { status: 404 });
  }

  const contract = await prisma.contract.update({
    where: { id: params.id },
    data: { status: "ATIVO" },
  });

  return NextResponse.json({ contract, ok: true });
  } catch (e) {
    return handleApiError(e, "CONTRATO_ATIVAR_MIGRACAO_POST");
  }
}
