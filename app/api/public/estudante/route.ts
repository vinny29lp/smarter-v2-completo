import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { enviarBoasVindasEstudante } from "@/lib/email";

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.nome || !body.email || !body.curso) {
    return NextResponse.json({ error: "Dados obrigatórios faltando." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) return NextResponse.json({ error: "E-mail já cadastrado. Use outro ou faça login." }, { status: 409 });

  let franchiseId: string | undefined;
  if (body.franchiseRef) {
    const f = await prisma.franchise.findUnique({ where: { id: body.franchiseRef } });
    franchiseId = f?.id;
  }
  if (!franchiseId) {
    const f = await prisma.franchise.findFirst({ where: { status: "ATIVO" } });
    franchiseId = f?.id;
  }

  // Instituição: apenas vincula se já existir — NUNCA cria automaticamente.
  // Cadastro de instituições é feito manualmente na aba Instituição.
  let institutionId: string | undefined;
  if (body.institutionNome) {
    const inst = await prisma.institution.findFirst({ where: { name: { contains: body.institutionNome } } });
    if (inst) institutionId = inst.id;
  }

  const senha = Math.random().toString(36).slice(-6).toUpperCase() + Math.floor(10+Math.random()*90);
  const hash = await bcrypt.hash(senha, 10);

  const user = await prisma.user.create({
    data: {
      name: body.nome, email: body.email,
      password: hash, role: "ESTUDANTE",
      franchiseId: franchiseId || undefined,
    },
  });

  await prisma.student.create({
    data: {
      userId: user.id, name: body.nome,
      cpf: body.cpf || null, rg: body.rg || null,
      dataNasc: body.dataNasc ? new Date(body.dataNasc) : null,
      sexo: body.sexo, email: body.email,
      celular: body.celular, telefone: body.telefone || null,
      endereco: body.endereco || null, bairro: body.bairro || null,
      cidade: body.cidade || null, uf: body.uf || null, cep: body.cep || null,
      curso: body.curso, periodo: body.periodo || null,
      previsaoConclusao: body.previsaoConclusao || null,
      institutionId: institutionId || null,
      franchiseId: franchiseId || undefined,
      discResult: body.discResult || null,
      habilidades: body.habilidades || [],
      idiomas: body.idiomas?.length ? body.idiomas : null,
      experiencias: body.experiencias?.length ? body.experiencias : null,
      objetivos: body.objetivos || null,
      linkedin: body.linkedin || null,
      portfolio: body.portfolio || null,
      status: "DISPONIVEL",
    },
  });

  // Enviar email de boas-vindas com credenciais de acesso (await garante envio em serverless)
  try {
    const emailOk = await enviarBoasVindasEstudante({
      email: body.email, nome: body.nome, senha, curso: body.curso,
    });
    console.log(`[email] boas-vindas estudante (público): ${emailOk ? "enviado" : "falhou"} → ${body.email}`);
  } catch (e) {
    console.warn("[email] Boas-vindas estudante falhou:", e);
  }

  return NextResponse.json({ ok: true, email: body.email, senha });
}
