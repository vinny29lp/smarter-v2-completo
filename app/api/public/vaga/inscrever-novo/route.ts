import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { checkRateLimit, getClientIpFromRequest } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    // Rate limit: 5 requisições por minuto por IP
    const ip = getClientIpFromRequest(req);
    if (!checkRateLimit(ip, "public_inscrever_novo", 5, 60_000)) {
      return NextResponse.json({ error: "Muitas tentativas. Aguarde um momento e tente novamente." }, { status: 429 });
    }

    const { nome, email, senha, curso, vagaId, franchiseId } = await req.json();
    if (!nome || !email || !curso || !senha) {
      return NextResponse.json({ error: "Preencha todos os campos." }, { status: 400 });
    }

    // Validar vagaId obrigatório
    if (!vagaId) {
      return NextResponse.json({ error: "Vaga não identificada." }, { status: 400 });
    }

    // Verificar se a vaga existe antes de criar qualquer dado
    const vacancy = await prisma.vacancy.findUnique({ where: { id: vagaId } });
    if (!vacancy) {
      return NextResponse.json({ error: "Vaga não encontrada." }, { status: 404 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "E-mail já cadastrado. Use 'Já tenho cadastro'." }, { status: 409 });

    const hash = await bcrypt.hash(senha, 10);
    const fid = franchiseId || (await prisma.franchise.findFirst({
      where: { status: "ATIVO" },
      orderBy: { createdAt: "desc" },
    }))?.id;

    // Envolver criação de user, student e application em transaction
    const { student } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: nome, email, password: hash, role: "ESTUDANTE", franchiseId: fid },
      });
      const student = await tx.student.create({
        data: { userId: user.id, name: nome, email, curso, status: "DISPONIVEL", franchiseId: fid },
      });

      const matching = student.discResult && vacancy.discDesejado
        ? (student.discResult === vacancy.discDesejado ? 95 : 65) : 60;

      await tx.application.create({ data: { studentId: student.id, vacancyId: vagaId, matching } });

      return { student };
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[inscrever-novo] Erro:", error);
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 });
  }
}
