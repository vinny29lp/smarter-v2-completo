/**
 * PATCH /api/app/support/felipe/:id — FRANQUEADORA logada.
 * Corpo: { acao: "APROVAR"|"REJEITAR"|"RESOLVER"|"REABRIR", notas? }
 *    ou { diagnostico, proposta?, changeUrl?, notas? } (registra o parecer do Felipe/Gabi).
 * Fase 1: nenhuma alteração de código é feita aqui — só registro e decisão humana.
 */
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { classificarRisco, podePropor, proximoStatus, type RiscoFelipe, type StatusFelipe } from "@/lib/support/felipe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const texto = (max: number) => z.string().trim().max(max);
const schema = z.union([
  z.object({ acao: z.enum(["APROVAR", "REJEITAR", "RESOLVER", "REABRIR"]), notas: texto(2000).optional() }).strict(),
  z.object({
    diagnostico: texto(5000).min(1), proposta: texto(5000).optional(),
    changeUrl: z.string().url().startsWith("https://").max(500).optional(), notas: texto(2000).optional(),
  }).strict(),
]);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (session.user.role !== "FRANQUEADORA") return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const caso = await prisma.supportCase.findUnique({ where: { id: params.id } });
  if (!caso) return NextResponse.json({ error: "Chamado não encontrado." }, { status: 404 });

  const atual = caso.felipeStatus as StatusFelipe;
  const risco = (caso.felipeRisk as RiscoFelipe | null)
    ?? classificarRisco({ category: caso.category, title: caso.title, description: caso.description, path: caso.path });
  const agora = new Date();
  const dados = parsed.data;

  if ("acao" in dados) {
    const novo = proximoStatus(atual, dados.acao, risco);
    if (!novo) return NextResponse.json({ error: "Essa ação não é permitida no status atual." }, { status: 409 });
    const decide = dados.acao === "APROVAR" || dados.acao === "REJEITAR";
    await prisma.supportCase.update({ where: { id: caso.id }, data: {
      felipeStatus: novo, felipeRisk: risco, felipeUpdatedAt: agora,
      ...(dados.notas ? { felipeNotes: dados.notas } : {}),
      ...(decide ? { felipeDecidedBy: session.user.id, felipeDecidedAt: agora } : {}),
    } });
    return NextResponse.json({ ok: true, felipeStatus: novo });
  }

  // Parecer: risco ALTO só diagnostica — a proposta de alteração é descartada.
  const propor = podePropor(risco) && Boolean(dados.proposta);
  const novo: StatusFelipe = propor ? "AGUARDANDO_APROVACAO" : "DIAGNOSTICADO";
  await prisma.supportCase.update({ where: { id: caso.id }, data: {
    felipeStatus: novo, felipeRisk: risco, felipeDiagnosis: dados.diagnostico,
    felipeProposal: propor ? dados.proposta : null, felipeChangeUrl: propor ? dados.changeUrl ?? null : null,
    ...(dados.notas ? { felipeNotes: dados.notas } : {}), felipeUpdatedAt: agora,
  } });
  return NextResponse.json({ ok: true, felipeStatus: novo, risco, propostaDescartada: Boolean(dados.proposta) && !propor });
}
