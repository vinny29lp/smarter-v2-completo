// GET /api/ies/[token] — retorna dados da IES pelo token (rota PÚBLICA, sem auth)
// Usado pelo portal público para carregar dados da instituição e verificar status

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const institution = await prisma.institution.findUnique({
    where: { token: params.token },
    select: {
      id: true,
      name: true,
      razaoSocial: true,
      cnpj: true,
      email: true,
      coordenador: true,
      cargoCoord: true,
      cidade: true,
      uf: true,
      tipo: true,
      convenioStatus: true,
      convenioAssinadoEm: true,
      assinanteName: true,
      assinanteEmail: true,
      // NÃO expõe: token, assinanteIp, assinanteCpf, franchiseId (dados sensíveis)
    },
  });

  if (!institution) {
    return NextResponse.json({ error: "Link inválido ou expirado." }, { status: 404 });
  }

  // Busca documentos da Smarter disponíveis para a IES baixar
  let documentos: any[] = [];
  try {
    documentos = await prisma.smarterDocumento.findMany({
      where: { ativo: true },
      orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
      select: { id: true, nome: true, tipo: true, url: true, descricao: true, vigencia: true } as any,
    });
  } catch { /* tabela pode não existir ainda */ }

  // Busca dados do sistema (para exibir logo, nome da Smarter, etc.)
  const config = await prisma.systemConfig.findUnique({
    where: { id: "default" },
    select: { nomeFantasia: true, razaoSocial: true, cnpj: true, email: true, telefone: true, logoDocUrl: true, responsavel: true, cargoResponsavel: true, assinaturaUrl: true, cidade: true, uf: true, endereco: true },
  } as any);

  return NextResponse.json({ institution, documentos, config });
}
