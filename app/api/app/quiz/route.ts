/**
 * GET  /api/app/quiz — status + 10 perguntas sorteadas (sem gabarito) para a unidade da sessão.
 * POST /api/app/quiz — { respostas:[{id,escolha}] } corrige NO SERVIDOR; ≥8 acertos grava quizAprovadoEm.
 * Só FRANQUEADO responde; FUNCIONARIO apenas consulta o status. A unidade vem sempre da sessão.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { sortearPerguntas, semGabarito, corrigir, MIN_ACERTOS } from "@/lib/treinamentos/quiz";

export const dynamic = "force-dynamic";

async function contexto() {
  const session = await getServerSession(authOptions);
  if (!session) return { erro: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  const role = session.user.role || "";
  const franchiseId = (session.user as any).franchiseId as string | undefined;
  if (!["FRANQUEADO", "FUNCIONARIO"].includes(role) || !franchiseId || franchiseId === "FRANQUEADORA") {
    return { erro: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }
  return { role, franchiseId, userId: (session.user as any).id as string | undefined } as const;
}

export async function GET() {
  try {
    const c = await contexto(); if ("erro" in c) return c.erro;
    const f: any = await prisma.franchise.findUnique({ where: { id: c.franchiseId }, select: { quizObrigatorio: true, quizAprovadoEm: true } as any });
    const tentativas = await prisma.treinamentoTentativa.count({ where: { franchiseId: c.franchiseId } });
    return NextResponse.json({
      obrigatorio: !!f?.quizObrigatorio, aprovadoEm: f?.quizAprovadoEm ?? null, minAcertos: MIN_ACERTOS, tentativas,
      perguntas: c.role === "FRANQUEADO" ? sortearPerguntas().map(semGabarito) : [],
    });
  } catch (e) { return handleApiError(e, "QUIZ_GET"); }
}

export async function POST(req: Request) {
  try {
    const c = await contexto(); if ("erro" in c) return c.erro;
    if (c.role !== "FRANQUEADO") return NextResponse.json({ error: "Somente o franqueado responde ao quiz." }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const r = corrigir(body?.respostas);
    if (!r) return NextResponse.json({ error: "Respostas inválidas." }, { status: 400 });
    await prisma.treinamentoTentativa.create({
      data: { franchiseId: c.franchiseId, userId: c.userId, acertos: r.acertos, total: r.total, aprovado: r.aprovado,
        respostas: (body.respostas as any[]).map(x => ({ id: x.id, escolha: x.escolha })) },
    });
    if (r.aprovado) {
      await prisma.franchise.updateMany({ where: { id: c.franchiseId, quizAprovadoEm: null } as any, data: { quizAprovadoEm: new Date() } as any });
    }
    return NextResponse.json({ acertos: r.acertos, total: r.total, aprovado: r.aprovado, minAcertos: MIN_ACERTOS });
  } catch (e) { return handleApiError(e, "QUIZ_POST"); }
}
