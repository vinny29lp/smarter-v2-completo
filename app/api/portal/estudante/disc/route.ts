import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST — salvar resultado do teste DISC do estudante logado
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ESTUDANTE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { resultado, respostas, grafico } = await req.json();

    if (!resultado || !["D","I","S","C"].includes(resultado)) {
      return NextResponse.json({ error: "Resultado DISC inválido" }, { status: 400 });
    }

    // Busca o estudante pelo userId da sessão
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
    });

    if (!student) {
      return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 });
    }

    const updated = await prisma.student.update({
      where: { id: student.id },
      data: {
        discResult: resultado,
        discData: grafico || {},
      },
    });

    return NextResponse.json({
      ok: true,
      resultado: updated.discResult,
      discData: updated.discData,
    });
  } catch (err: any) {
    console.error("[DISC POST] erro:", err);
    return NextResponse.json({ error: "Erro ao salvar resultado DISC" }, { status: 500 });
  }
}

// GET — verificar se estudante já tem resultado DISC
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ESTUDANTE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    select: { discResult: true, discData: true },
  });

  return NextResponse.json({
    temDisc: !!student?.discResult,
    resultado: student?.discResult || null,
  });
}
