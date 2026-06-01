import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Sem permissão. Apenas Admin (Franqueadora)." }, { status: 403 });
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
}
