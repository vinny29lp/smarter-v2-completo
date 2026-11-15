/**
 * GET /api/public/ies/relatorio/[evalId]?t=<token> — relatório semestral de estágio para a IES (sem login).
 * O token é um HMAC do id da avaliação, enviado só no e-mail da Lia à instituição. Página imprimível (salvar em PDF).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tokenRelatorioValido } from "@/lib/automacao/token";
import { gerarAvaliacaoRespondidaPDF } from "@/lib/documents/templates";
import { wrapParaPDF } from "@/lib/pdf-wrapper";
import { getSystemConfig } from "@/lib/getConfig";
import { periodoSemestre } from "@/lib/automacao/iesRegras";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { evalId: string } }) {
  const t = new URL(req.url).searchParams.get("t") || "";
  if (!tokenRelatorioValido(params.evalId, t)) return new NextResponse("Link inválido.", { status: 404 });

  const ev = await prisma.evaluation.findUnique({
    where: { id: params.evalId },
    include: {
      contract: {
        select: {
          supervisorNome: true,
          student: { select: { name: true, curso: true } },
          company: { select: { name: true, responsavel: true } },
          franchise: { select: { name: true, cidade: true } },
        },
      },
    },
  });
  if (!ev || ev.tipo !== "semestral" || !ev.respondidoAt) return new NextResponse("Relatório não encontrado.", { status: 404 });

  const cfg = await getSystemConfig();
  const html = gerarAvaliacaoRespondidaPDF({
    nomeEstagiario: ev.contract.student.name,
    cursoEstagiario: ev.contract.student.curso || "---",
    nomeEmpresa: ev.contract.company.name,
    supervisor: ev.contract.supervisorNome || ev.contract.company.responsavel || ev.contract.company.name,
    nomeAgente: ev.contract.franchise?.name || cfg?.nomeAgente || "Smarter Estágios",
    cidade: ev.contract.franchise?.cidade || cfg?.cidade || "---",
    periodo: periodoSemestre(ev.respondidoAt),
    respondidoAt: ev.respondidoAt.toISOString(),
    respostas: (ev.respostas as Record<string, number>) || {},
    observacoes: ev.observacoes || undefined,
  });
  return new Response(wrapParaPDF(html, `Relatório semestral — ${ev.contract.student.name}`), {
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" },
  });
}
