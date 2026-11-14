import { prisma } from "@/lib/prisma";
import { arquivarEstudante } from "@/lib/lixeira";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { normalizarDataOpcional, dataOpcionalEhValida } from "@/lib/dates";
import bcrypt from "bcryptjs";
import { logAudit, getClientIP } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  // SEC-A06: guarda explícita de autenticação
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const estudante = await prisma.student.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, email: true, active: true, lastLoginAt: true } },
      institution: true,
      contracts: {
        include: { company: true },
        orderBy: { createdAt: "desc" },
      },
      applications: { include: { vacancy: { include: { company: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!estudante) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ estudante });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const body = await req.json();

  // Alterar senha do estudante — requer FRANQUEADORA ou FRANQUEADO
  if (body.action === "change_password") {
    if (!["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO"].includes(session?.user?.role || "")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }
    if (!body.password || String(body.password).length < 6) {
      return NextResponse.json({ error: "Senha obrigatória (mínimo 6 caracteres)." }, { status: 400 });
    }
    // SEC: resolve o userId a partir do estudante da URL — NUNCA confia em body.userId.
    // Sem isso, qualquer papel autorizado poderia trocar a senha de QUALQUER usuário
    // do sistema (inclusive FRANQUEADORA) enviando um userId arbitrário (IDOR / account takeover).
    const alvo = await prisma.student.findUnique({ where: { id: params.id }, select: { userId: true } });
    if (!alvo?.userId) {
      return NextResponse.json({ error: "Estudante não encontrado." }, { status: 404 });
    }
    const hash = await bcrypt.hash(body.password, 10);
    await prisma.user.update({ where: { id: alvo.userId }, data: { password: hash } });
    return NextResponse.json({ ok: true });
  }

  // Alterar e-mail de login do estudante — requer FRANQUEADORA ou FRANQUEADO
  if (body.action === "change_email") {
    if (!["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO"].includes(session?.user?.role || "")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }
    if (!body.email) {
      return NextResponse.json({ error: "email é obrigatório" }, { status: 400 });
    }
    // SEC: mesmo raciocínio do change_password — vincula a alteração ao estudante da URL,
    // ignorando body.userId para impedir alteração de e-mail de contas arbitrárias.
    const alvo = await prisma.student.findUnique({ where: { id: params.id }, select: { userId: true } });
    if (!alvo?.userId) {
      return NextResponse.json({ error: "Estudante não encontrado." }, { status: 404 });
    }
    await prisma.user.update({ where: { id: alvo.userId }, data: { email: body.email } });
    return NextResponse.json({ ok: true });
  }

  // Reativar / alterar status — requer FRANQUEADORA
  if (body.status !== undefined) {
    if (session?.user?.role !== "FRANQUEADORA") {
      return NextResponse.json({ error: "Apenas FRANQUEADORA pode alterar o status do estudante" }, { status: 403 });
    }
  }

  // Ownership check: FRANQUEADO/FUNCIONARIO só edita estudante da própria franquia
  const role = session?.user?.role || "";
  const franchiseId = session?.user?.franchiseId;
  if (role !== "FRANQUEADORA") {
    const existing = await prisma.student.findUnique({ where: { id: params.id }, select: { franchiseId: true } });
    if (!existing || (existing.franchiseId && existing.franchiseId !== franchiseId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // SEC-A05: allowlist explícita de campos editáveis — proíbe mass assignment
  // Campos bloqueados: franchiseId, userId, status (gerenciado acima), discResult, discData
  const allowed = [
    "name","cpf","rg","dataNasc","sexo","email","celular","telefone",
    "endereco","bairro","cidade","uf","cep",
    "curso","periodo","previsaoConclusao","turno",
    "habilidades","idiomas","experiencias","objetivos","curriculo",
    "linkedin","portfolio","observacoes",
    "institutionId",
    "menorDeIdade","nomeResponsavel",
  ];
  const data: Record<string, any> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  // institutionId vazio ("") não é um FK válido — normaliza para null
  if (data.institutionId === "") data.institutionId = null;
  // Validação ANTES de tocar no Prisma — se algo não faz sentido, devolve uma
  // mensagem clara por campo em vez de deixar o Prisma quebrar com um erro
  // técnico cru (ex: "Invalid `prisma.student.update()` invocation...").
  const errosValidacao: string[] = [];
  if (!dataOpcionalEhValida(data.dataNasc)) {
    errosValidacao.push("Data de nascimento inválida — verifique o campo.");
  }
  if (errosValidacao.length > 0) {
    return NextResponse.json({ error: errosValidacao.join(" ") }, { status: 400 });
  }

  // dataNasc vem como "YYYY-MM-DD" do front, ou "" quando o campo é limpo no
  // formulário — Prisma exige DateTime ISO-8601 ou null (não aceita string vazia).
  if (data.dataNasc !== undefined) data.dataNasc = normalizarDataOpcional(data.dataNasc);
  // Franqueadora pode atualizar status diretamente (já validado acima)
  if (body.status !== undefined && role === "FRANQUEADORA") {
    data.status = body.status;
  }

  try {
    const estudante = await prisma.student.update({ where: { id: params.id }, data });
    return NextResponse.json({ estudante });
  } catch (e: any) {
    console.error("[estudantes/id] PATCH error:", e?.message || e);
    if (e?.code === "P2002") {
      // Violação de unicidade — ex: CPF já cadastrado em outro estudante
      const campo = Array.isArray(e?.meta?.target) ? e.meta.target[0] : e?.meta?.target;
      const label = campo === "cpf" ? "CPF" : campo === "email" ? "E-mail" : "Este valor";
      return NextResponse.json({ error: `${label} já está cadastrado para outro estudante.` }, { status: 409 });
    }
    if (e?.code === "P2025") {
      return NextResponse.json({ error: "Estudante não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ error: "Não foi possível salvar as alterações. Verifique os dados e tente novamente." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Apenas FRANQUEADORA pode excluir estudantes" }, { status: 403 });
  }

  const estudante = await prisma.student.findUnique({
    where: { id: params.id },
    include: {
      institution: { select: { name: true } },
      franchise: { select: { name: true } },
      contracts: { select: { numero: true, status: true, bolsa: true, dataInicio: true, dataFim: true, company: { select: { name: true } } } },
    },
  });
  if (!estudante) return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 });

  // Foto dos dados ANTES de apagar. Esta exclusão remove estudante, usuário e contratos de uma vez
  // e (por restrição de FK) limpa o histórico do próprio usuário — sem este registro, nada sobra pra
  // reconstruir o cadastro (caso real: estudante sumiu e nenhum dado pôde ser recuperado).
  // É gravado em nome de quem excluiu (não do estudante) e a limpeza de 90 dias não apaga *EXCLUID*.
  const snapshot = {
    id: estudante.id, nome: estudante.name, cpf: estudante.cpf, rg: estudante.rg,
    email: estudante.email, celular: estudante.celular, telefone: estudante.telefone,
    dataNasc: estudante.dataNasc, endereco: estudante.endereco, bairro: estudante.bairro,
    cidade: estudante.cidade, uf: estudante.uf, cep: estudante.cep,
    curso: estudante.curso, periodo: estudante.periodo, previsaoConclusao: estudante.previsaoConclusao,
    instituicao: estudante.institution?.name, unidade: estudante.franchise?.name, status: estudante.status,
    contratos: estudante.contracts.map(c => ({ numero: c.numero, status: c.status, empresa: c.company?.name, bolsa: c.bolsa, inicio: c.dataInicio, fim: c.dataFim })),
  };

  try {
    await prisma.$transaction(async (tx) => {
      // #27 — cópia completa na lixeira (restaurável por 90 dias) ANTES de apagar
      await arquivarEstudante(tx, params.id, session.user.id);
      // Delete evaluations linked to student's contracts
      await tx.evaluation.deleteMany({ where: { contract: { studentId: params.id } } });
      // Delete internship documents related to student's contracts
      await tx.internshipDocument.deleteMany({ where: { contract: { studentId: params.id } } });
      // Delete financials linked to student's contracts
      await tx.financial.deleteMany({ where: { contract: { studentId: params.id } } });
      // Delete contracts
      await tx.contract.deleteMany({ where: { studentId: params.id } });
      // Delete applications
      await tx.application.deleteMany({ where: { studentId: params.id } });
      // Delete DISC tests
      await tx.discTest.deleteMany({ where: { studentId: params.id } });
      // Delete student FIRST (frees the FK userId → User)
      await tx.student.delete({ where: { id: params.id } });
      if (estudante.userId) {
        // Limpar logs e notificações antes de deletar o usuário (FK NoAction)
        await tx.activityLog.deleteMany({ where: { userId: estudante.userId } });
        await tx.notification.deleteMany({ where: { userId: estudante.userId } });
        await tx.user.delete({ where: { id: estudante.userId } });
      }
    }, { timeout: 30_000 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erro ao excluir estudante." }, { status: 500 });
  }

  await logAudit({
    userId: session.user.id,
    role: session.user.role || "",
    acao: "ESTUDANTE_EXCLUIDO",
    modulo: "estudantes",
    detalhes: `snapshot:${JSON.stringify(snapshot).slice(0, 3500)}`,
    ip: getClientIP(req),
  });

  return NextResponse.json({ ok: true });
}
