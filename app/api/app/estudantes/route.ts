import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enviarBoasVindasEstudante } from "@/lib/email";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function GET() {
  // Estudantes são públicos a todos os painéis (franqueadora e todas as unidades)
  // Não filtra por franchiseId — todos podem visualizar todos os estudantes
  const estudantes = await prisma.student.findMany({
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
    take: 200,
  });
  return NextResponse.json({ estudantes });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.nome || !body.email || !body.curso) {
    return NextResponse.json({ error: "Campos obrigatórios: nome, email, curso." }, { status: 400 });
  }

  // Gera senha aleatória se não fornecida (ou se for apenas espaços)
  const senhaPlain = (body.senha || "").trim() || Math.random().toString(36).slice(-8);

  let student: any = null;

  try {
    const franchiseId = body.franchiseId || session?.user?.franchiseId || undefined;
    const hash = await bcrypt.hash(senhaPlain, 10);

    // Usa prisma diretamente para evitar problemas com revalidatePath de Server Actions em Route Handlers
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
        observacoes: body.observacoes || null,
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

  // Email de boas-vindas fora do try/catch de criação — sempre enviado, nunca bloqueia a resposta
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
