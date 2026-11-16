import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkPermission } from "@/lib/permissions";
import { abrirVagaDeSolicitacao } from "@/lib/vagas/abrirDeSolicitacao";
import { convidarParaVagaAgora } from "@/lib/automacao/lia";

export const dynamic = "force-dynamic";

// POST — converte solicitação em Vacancy (com link público) e já convida candidatos
export async function POST(req: Request, { params }: { params: { id: string; solId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permCheck = checkPermission(session, "empresas");
  if (permCheck) return permCheck;

  // Escopo: FRANQUEADO/FUNCIONARIO só convertem solicitações da própria unidade
  const franchiseSessao = (session.user as any).franchiseId as string | undefined;
  const master = ["FRANQUEADORA", "EQUIPE"].includes(session.user.role || "");
  if (!master) {
    const sol: any = await (prisma as any).vagaSolicitacao.findUnique({ where: { id: params.solId }, select: { franchiseId: true, company: { select: { franchiseId: true } } } });
    const dona = sol?.franchiseId || sol?.company?.franchiseId;
    if (sol && dona && dona !== franchiseSessao) return NextResponse.json({ error: "Solicitação não encontrada." }, { status: 404 });
  }

  const r = await abrirVagaDeSolicitacao(params.solId, franchiseSessao || null);
  if (!r.ok) {
    const msg = r.motivo === "ja_convertida" ? "Esta solicitação já foi convertida em vaga."
      : r.motivo === "sem_unidade" ? "Não foi possível identificar a unidade responsável pela vaga." : "Solicitação não encontrada.";
    return NextResponse.json({ error: msg }, { status: r.motivo === "nao_encontrada" ? 404 : 400 });
  }
  const convites = await convidarParaVagaAgora(r.vagaId).catch(() => ({ convidados: 0, elegiveis: 0 }));
  return NextResponse.json({ ok: true, vagaId: r.vagaId, convidados: convites.convidados });
}
