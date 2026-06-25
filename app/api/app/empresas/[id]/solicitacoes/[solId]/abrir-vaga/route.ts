import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

// POST — converte solicitação em Vacancy
export async function POST(req: Request, { params }: { params: { id: string; solId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permCheck = checkPermission(session, "empresas");
  if (permCheck) return permCheck;

  const sol = await (prisma as any).vagaSolicitacao.findUnique({
    where: { id: params.solId },
    include: { company: { select: { id: true, franchiseId: true, cidade: true, uf: true, endereco: true } } },
  });

  if (!sol) return NextResponse.json({ error: "Solicitação não encontrada." }, { status: 404 });
  if (sol.status === "CONVERTIDA") return NextResponse.json({ error: "Esta solicitação já foi convertida em vaga." }, { status: 400 });

  // franchiseId: usa o da solicitação; se não tiver, usa o da empresa; fallback para o da sessão
  const franchiseId =
    sol.franchiseId ||
    sol.company.franchiseId ||
    (session.user as any).franchiseId ||
    null;

  if (!franchiseId) {
    return NextResponse.json({ error: "Não foi possível identificar a unidade responsável pela vaga." }, { status: 400 });
  }

  // Monta descrição incluindo atividades + supervisor
  const descricao = [
    sol.atividades,
    sol.supervisorNome ? `\nSupervisor: ${sol.supervisorNome}${sol.supervisorCargo ? " — " + sol.supervisorCargo : ""}` : "",
    sol.supervisorEmail ? `E-mail supervisor: ${sol.supervisorEmail}` : "",
    sol.supervisorTel   ? `Tel supervisor: ${sol.supervisorTel}` : "",
  ].filter(Boolean).join("\n");

  const vaga = await prisma.vacancy.create({
    data: {
      titulo:        sol.funcao,
      funcao:        sol.funcao,
      descricao,
      beneficios:    sol.beneficios || null,
      modalidade:    sol.modalidade || "Presencial",
      bolsa:         sol.bolsa,
      auxTransporte: sol.auxTransporte || 0,
      cargaHoraria:  sol.cargaHoraria || 30,
      horario:       sol.horario,
      cidade:        sol.company.cidade || null,
      uf:            sol.company.uf || null,
      endereco:      sol.company.endereco || null,
      cursoRequerido: sol.cursoDesejado || null,
      companyId:     sol.company.id,
      franchiseId,
      status:        "ABERTA",
    } as any,
  });

  // Marca solicitação como convertida e vincula à vaga criada
  await (prisma as any).vagaSolicitacao.update({
    where: { id: sol.id },
    data: { status: "CONVERTIDA", vagaId: vaga.id },
  });

  return NextResponse.json({ ok: true, vagaId: vaga.id });
}
