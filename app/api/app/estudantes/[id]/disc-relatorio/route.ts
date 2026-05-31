import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gerarRelatorioDisc } from "@/lib/documents/disc-report";
import { wrapParaPDF } from "@/lib/pdf-wrapper";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const student = await prisma.student.findUnique({
    where: { id: params.id },
    select: { discResult: true, discData: true, name: true, curso: true },
  });

  if (!student?.discResult) {
    return NextResponse.json({ error: "Nenhum teste DISC realizado para este estudante." }, { status: 404 });
  }

  const html = gerarRelatorioDisc({
    resultado: student.discResult,
    grafico: student.discData,
    nome: student.name,
    curso: student.curso || undefined,
  });

  // Injeta print CSS completo + auto-print para que o PDF fique idêntico ao preview
  const wrapped = wrapParaPDF(html, `Relatório DISC — ${student.name}`);

  return new Response(wrapped, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
