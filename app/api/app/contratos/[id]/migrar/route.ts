import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";

const ALLOWED_ROLES = ["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO"];

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes(session.user.role || "")) {
    return NextResponse.json({ error: "Sem permissão para anexar documentos físicos." }, { status: 403 });
  }

  const body = await req.json();
  const { tcePdfBase64, nomeArquivo } = body as { tcePdfBase64: string; nomeArquivo?: string };

  if (!tcePdfBase64) {
    return NextResponse.json({ error: "PDF do documento é obrigatório." }, { status: 400 });
  }

  // Verificar se o contrato existe
  const contrato = await prisma.contract.findUnique({ where: { id: params.id } });
  if (!contrato) {
    return NextResponse.json({ error: "Contrato não encontrado." }, { status: 404 });
  }

  // Determina título do documento
  const tituloDoc = (nomeArquivo || "Documento Físico").replace(/\.pdf$/i, "").trim();

  // Cria um InternshipDocument com tipo="FISICO" — suporta múltiplos uploads
  await prisma.internshipDocument.create({
    data: {
      contractId: params.id,
      tipo: "FISICO",
      titulo: tituloDoc,
      status: "GERADO",
      pdfUrl: tcePdfBase64,
    },
  });

  // Atualiza metadados de migração no contrato (sem sobrescrever tceMigradaUrl legado)
  const contract = await prisma.contract.update({
    where: { id: params.id },
    data: {
      origem: "MIGRADO",
      migradoEm: contrato.migradoEm || new Date(),
      migradoPor: (session.user as any).id || session.user.email || "",
      migradoPorNome: session.user.name || session.user.email || "",
    },
    include: { documents: true },
  });

  return NextResponse.json({ contract, ok: true });
  } catch (e) {
    return handleApiError(e, "CONTRATO_MIGRAR_POST");
  }
}
