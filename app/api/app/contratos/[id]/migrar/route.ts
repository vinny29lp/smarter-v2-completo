import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Sem permissão. Apenas Admin (Franqueadora)." }, { status: 403 });
  }

  const body = await req.json();
  const { tcePdfBase64, nomeArquivo } = body as { tcePdfBase64: string; nomeArquivo?: string };

  if (!tcePdfBase64) {
    return NextResponse.json({ error: "TCE assinada é obrigatória." }, { status: 400 });
  }

  // Verificar se o contrato existe
  const contrato = await prisma.contract.findUnique({ where: { id: params.id } });
  if (!contrato) {
    return NextResponse.json({ error: "Contrato não encontrado." }, { status: 404 });
  }

  const contract = await prisma.contract.update({
    where: { id: params.id },
    data: {
      origem: "MIGRADO",
      migradoEm: new Date(),
      migradoPor: (session.user as any).id || session.user.email || "",
      migradoPorNome: session.user.name || session.user.email || "",
      tceMigradaUrl: tcePdfBase64,
    },
  });

  return NextResponse.json({ contract, ok: true });
  } catch (e) {
    return handleApiError(e, "CONTRATO_MIGRAR_POST");
  }
}
