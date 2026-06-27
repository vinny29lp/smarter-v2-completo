// GET /api/ies/[token]/documentos — documentos públicos da Smarter para a IES visualizar
// Rota pública — IES não precisa de login

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  // Validar token da IES
  const institution = await prisma.institution.findUnique({
    where: { token: params.token },
    select: { id: true },
  });
  if (!institution) return NextResponse.json({ error: "Link inválido." }, { status: 404 });

  // Retorna documentos ativos (ordenados por ordem + data de criação)
  const documentos = await prisma.smarterDocumento.findMany({
    where: { ativo: true },
    orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
    select: { id: true, nome: true, tipo: true, url: true, descricao: true, vigencia: true, createdAt: true } as any,
  });

  return NextResponse.json({ documentos });
}
