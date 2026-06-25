// POST /api/app/estudantes/[id]/enviar-acesso
// Gera nova senha temporária, atualiza o hash do User vinculado ao estudante
// e dispara o email de boas-vindas com as credenciais de acesso ao portal.
//
// Casos tratados:
//   1. Estudante sem user (raro) → cria User + Student link, envia email
//   2. Estudante com user → reseta senha, envia email com novas credenciais

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { enviarBoasVindasEstudante } from "@/lib/email";
import crypto from "crypto";

function gerarSenhaTemp(): string {
  // Senha legível: 3 grupos de 3 chars alfanuméricos separados por hífen
  const part = () => crypto.randomBytes(3).toString("hex").slice(0, 3).toUpperCase();
  return `${part()}-${part()}-${part()}`;
}

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (!["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO"].includes(role || "")) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const studentId = params.id;

  // Busca estudante com dados do user vinculado
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      name: true,
      email: true,
      curso: true,
      userId: true,
      user: { select: { id: true, email: true } },
    },
  });

  if (!student) {
    return NextResponse.json({ error: "Estudante não encontrado." }, { status: 404 });
  }

  const senhaPlain = gerarSenhaTemp();
  const hash = await bcrypt.hash(senhaPlain, 10);

  if (student.user) {
    // Caso 1: já tem user — apenas reseta a senha
    await prisma.user.update({
      where: { id: student.user.id },
      data: { password: hash },
    });
  } else {
    // Caso 2: sem user (importado sem criar conta) — cria User e vincula ao Student
    const newUser = await prisma.user.create({
      data: {
        name: student.name,
        email: student.email,
        password: hash,
        role: "ESTUDANTE",
        // franchiseId = null → estudante vinculado ao Admin (FRANQUEADORA), nunca a uma unidade
      },
    });
    await prisma.student.update({
      where: { id: studentId },
      data: { userId: newUser.id },
    });
  }

  // Dispara email com as novas credenciais
  const emailEnviado = await enviarBoasVindasEstudante({
    email: student.email,
    nome: student.name,
    senha: senhaPlain,
    curso: student.curso || "Não informado",
  });

  if (!emailEnviado) {
    return NextResponse.json(
      { error: "Senha redefinida, mas houve falha no envio do email. Verifique a chave Resend." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, email: student.email });
}
