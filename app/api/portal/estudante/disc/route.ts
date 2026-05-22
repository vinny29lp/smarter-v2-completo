import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

async function getStudent(session: any) {
  if (session?.user?.studentId) {
    const s = await prisma.student.findUnique({ where: { id: session.user.studentId } });
    if (s) return s;
  }
  if (session?.user?.id) {
    const s = await prisma.student.findFirst({ where: { userId: session.user.id } });
    if (s) return s;
  }
  if (session?.user?.email) {
    const s = await prisma.student.findFirst({ where: { email: session.user.email } });
    if (s) return s;
  }
  return null;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const student = await getStudent(session);
  if (!student) return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 });
  const body = await req.json();
  const { resultado, respostas, grafico } = body;
  const updated = await prisma.student.update({
    where: { id: student.id },
    data: {
      discResult: resultado,
      discData: { resultado, respostas, grafico, realizadoEm: new Date().toISOString() },
    },
  });
  return NextResponse.json({ success: true, discResult: updated.discResult });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const student = await getStudent(session);
  if (!student) return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 });
  return NextResponse.json({ discResult: student.discResult, discData: student.discData });
}
