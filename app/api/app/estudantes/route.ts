import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enviarBoasVindasEstudante } from "@/lib/email";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { checkPermission } from "@/lib/permissions";
import { logAudit, getClientIP } from "@/lib/audit";
import { criarEstudanteSchema, zodError } from "@/lib/api-schemas";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permCheck = checkPermission(session, "estudantes");
  if (permCheck) return permCheck;

  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, parseInt(searchParams.get("page")  || "1"));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50")));
  const skip  = (page - 1) * limit;

  const where = {};

  const [estudantes, total] = await Promise.all([
    prisma.student.findMany({
      where,
      select: {
        id: true, name: true, email: true, cpf: true,
        curso: true, cidade: true, uf: true,
        status: true, discResult: true, createdAt: true,
        institution: { select: { id: true, name: true } },
        franchise:   { select: { id: true, name: true } },
        contracts: {
          select: { id: true, status: true, company: { select: { id: true, name: true } } },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.student.count({ where }),
  ]);

  return NextResponse.json({
    estudantes,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permCheck = checkPermission(session, "estudantes");
  if (permCheck) return permCheck;

  const rawBody = await req.json();
  const parsed = criarEstudanteSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(zodError(parsed.error), { status: 400 });
  }
  const body = parsed.data;

  const senhaPlain = (body.senha || "").trim() || require("crypto").randomBytes(6).toString("hex");
  let student: any = null;

  try {
    // Estudantes sempre ligados ao Admin (franchiseId = null) para não se perder ao excluir uma unidade
    const franchiseId: undefined = undefined;
    const hash = await bcrypt.hash(senhaPlain, 10);

    const user = await prisma.user.create({
      data: {
        name: body.nome,
        email: body.email,
        password: hash,
        role: "ESTUDANTE",
        franchiseId: franchiseId || undefined,
      },
    });

    student = await prisma.student.create({
      data: {
        userId: user.id,
        name: body.nome,
        cpf: body.cpf || null,
        rg: body.rg || null,
        dataNasc: body.dataNasc ? new Date(body.dataNasc) : null,
        sexo: body.sexo || null,
        email: body.email,
        celular: body.celular || null,
        telefone: body.telefone || null,
        endereco: body.endereco || null,
        bairro: body.bairro || null,
        cidade: body.cidade || null,
        uf: body.uf || null,
        cep: body.cep || null,
        curso: body.curso,
        periodo: body.periodo || null,
        previsaoConclusao: body.previsaoConclusao || null,
        institutionId: body.institutionId || null,
        franchiseId: franchiseId || undefined,
        observacoes: body.observacoes ? String(body.observacoes).slice(0, 2000) : null,
        menorDeIdade: body.menorDeIdade || false,
        nomeResponsavel: body.nomeResponsavel || null,
        habilidades: [],
        status: "DISPONIVEL",
      },
    });
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "E-mail ou CPF já cadastrado." }, { status: 409 });
    }
    return NextResponse.json({ error: e.message || "Erro ao criar estudante." }, { status: 500 });
  }

  // Audit log
  logAudit({
    userId: session.user.id,
    role: session.user.role || "",
    franchiseId: student.franchiseId,
    acao: "ESTUDANTE_CRIADO",
    modulo: "estudantes",
    detalhes: `estudante:${student.id} | nome:${body.nome} | email:${body.email}`,
    ip: getClientIP(req),
  });

  try {
    const emailOk = await enviarBoasVindasEstudante({
      email: body.email,
      nome: body.nome,
      senha: senhaPlain,
      curso: body.curso,
    });
    console.log(`[email] boas-vindas estudante: ${emailOk ? "enviado" : "falhou"} → ${body.email}`);
  } catch (emailErr) {
    console.warn("[email] Falha boas-vindas estudante:", emailErr);
  }

  return NextResponse.json({ student }, { status: 201 });
}
