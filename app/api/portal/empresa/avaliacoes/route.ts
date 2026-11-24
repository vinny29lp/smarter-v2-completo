import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_ROLES = ["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO"];
const CRITERIOS = ["pontualidade", "produtividade", "iniciativa", "comunicacao", "aprendizado", "postura"];
const VINTE_DIAS = 20 * 86_400_000;

/** FRANQUEADORA vê tudo; FRANQUEADO/FUNCIONARIO só os contratos da própria unidade. */
function unidadeNaoPode(role: string, sessionFranchiseId: string | null | undefined, contratoFranchiseId: string | null) {
  return role !== "FRANQUEADORA" && (!sessionFranchiseId || contratoFranchiseId !== sessionFranchiseId);
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role || "";
  const { searchParams } = new URL(req.url);
  const contratoParam = searchParams.get("contrato");

  // ── Admins: podem visualizar um contrato específico pelo ID (para testar/abrir formulário) ──
  if (ADMIN_ROLES.includes(role)) {
    if (!contratoParam) return NextResponse.json({ contratos: [] });
    const contrato = await prisma.contract.findUnique({
      where: { id: contratoParam },
      select: {
        id: true, status: true, dataInicio: true, dataFim: true, franchiseId: true,
        student: { select: { name: true, curso: true } },
        evaluations: { orderBy: { createdAt: "desc" }, take: 3 },
      },
    });
    if (contrato && unidadeNaoPode(role, session.user.franchiseId, contrato.franchiseId)) return NextResponse.json({ contratos: [] });
    return NextResponse.json({ contratos: contrato ? [contrato] : [] });
  }

  // ── EMPRESA: fluxo normal ──
  if (role !== "EMPRESA") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { companyId: true },
  });
  if (!user?.companyId) return NextResponse.json({ contratos: [] });

  const contratos = await prisma.contract.findMany({
    where: { companyId: user.companyId, status: { in: ["ATIVO", "PENDENTE", "AGUARDANDO_ASSINATURA"] } },
    include: {
      student: { select: { name: true, curso: true } },
      evaluations: { orderBy: { createdAt: "desc" }, take: 3 },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ contratos });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role || "";
  // A unidade também pode lançar a avaliação pela tela do contrato ("Abrir formulário diretamente"):
  // antes só EMPRESA passava e a unidade recebia "Unauthorized" ao enviar.
  if (!session || (role !== "EMPRESA" && !ADMIN_ROLES.includes(role))) {
    return NextResponse.json({ error: "Sessão expirada. Entre novamente para enviar a avaliação." }, { status: 401 });
  }

  try {
    const { contratoId, respostas, observacoes } = await req.json();
    if (!contratoId || !respostas || typeof respostas !== "object") {
      return NextResponse.json({ error: "Dados obrigatórios ausentes" }, { status: 400 });
    }
    for (const k of CRITERIOS) {
      const n = Number(respostas[k]);
      if (!Number.isInteger(n) || n < 1 || n > 5) return NextResponse.json({ error: "Informe uma nota de 1 a 5 em cada critério." }, { status: 400 });
    }
    const contract = await prisma.contract.findUnique({
      where: { id: contratoId },
      select: { id: true, companyId: true, franchiseId: true, evaluations: { where: { status: "respondido" }, select: { respondidoAt: true }, orderBy: { respondidoAt: "desc" }, take: 1 } },
    });
    if (!contract) return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });
    if (role === "EMPRESA") {
      const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { companyId: true } });
      if (contract.companyId !== user?.companyId) return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });
    } else if (unidadeNaoPode(role, session.user.franchiseId, contract.franchiseId)) {
      return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });
    }

    // Evita duplicar quando a avaliação já foi registrada há pouco (duplo clique, reenvio, link do e-mail).
    const ultima = contract.evaluations[0]?.respondidoAt;
    if (ultima && Date.now() - ultima.getTime() < VINTE_DIAS) {
      return NextResponse.json({ ok: true, jaRegistrada: true }, { status: 200 });
    }

    const evaluation = await prisma.evaluation.create({
      data: {
        contractId: contract.id,
        tipo: "semestral",
        respostas,
        observacoes: observacoes || null,
        status: "respondido",
        respondidoAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, evaluation }, { status: 201 });
  } catch (e) {
    console.error("[avaliacoes] POST error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Não foi possível enviar a avaliação. Tente novamente." }, { status: 500 });
  }
}
