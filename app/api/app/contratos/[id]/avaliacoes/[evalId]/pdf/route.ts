import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gerarAvaliacaoRespondidaPDF } from "@/lib/documents/templates";
import { wrapParaPDF } from "@/lib/pdf-wrapper";
import { getSystemConfig } from "@/lib/getConfig";
import { handleApiError } from "@/lib/api-response";

export async function GET(
  _req: Request,
  { params }: { params: { id: string; evalId: string } }
) {
  try {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const evaluation = await prisma.evaluation.findUnique({
    where: { id: params.evalId },
    include: {
      contract: {
        select: {
          id: true,
          companyId: true,
          franchiseId: true,
          student: { select: { name: true, curso: true } },
          supervisorNome: true,
          company: { select: { name: true, responsavel: true } },
          franchise: { select: { name: true, cidade: true, responsavel: true } },
        },
      },
    },
  });

  if (!evaluation) return NextResponse.json({ error: "Avaliação não encontrada" }, { status: 404 });
  if (evaluation.contract.id !== params.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Access control: franqueadora, franqueado, or the empresa that owns the contract
  const role = session.user.role;
  if (role === "FRANQUEADO" && evaluation.contract.franchiseId !== (session.user as any).franchiseId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (role === "EMPRESA") {
    // Empresa só pode baixar avaliações dos seus próprios contratos
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { companyId: true } });
    if (evaluation.contract.companyId !== user?.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const cfg = await getSystemConfig();
  const nomeAgente = evaluation.contract.franchise?.name || cfg?.nomeAgente || "Smarter Estagios";
  const cidade = evaluation.contract.franchise?.cidade || cfg?.cidade || "---";

  // Determine period label
  const now = evaluation.respondidoAt || evaluation.createdAt || new Date();
  const d = new Date(now as Date);
  const semestre = d.getMonth() < 6 ? "1" : "2";
  const periodo = `${d.getFullYear()}/${semestre}`;

  const respostas = (evaluation.respostas as Record<string, number>) || {};

  const html = gerarAvaliacaoRespondidaPDF({
    nomeEstagiario: evaluation.contract.student.name,
    cursoEstagiario: evaluation.contract.student.curso || "---",
    nomeEmpresa: evaluation.contract.company.name,
    supervisor: (evaluation.contract as any).supervisorNome || (evaluation.contract.company as any).responsavel || evaluation.contract.company.name,
    nomeAgente,
    cidade,
    periodo,
    respondidoAt: evaluation.respondidoAt?.toISOString(),
    respostas,
    observacoes: evaluation.observacoes || undefined,
  });

  const wrapped = wrapParaPDF(html, `Avaliacao Semestral — ${evaluation.contract.student.name}`);

  return new Response(wrapped, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
  } catch (e) {
    return handleApiError(e, "AVALIACAO_PDF_GET");
  }
}
