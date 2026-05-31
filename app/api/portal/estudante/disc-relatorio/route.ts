import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gerarRelatorioDisc } from "@/lib/documents/disc-report";
import { wrapParaPDF } from "@/lib/pdf-wrapper";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ESTUDANTE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    select: { discResult: true, discData: true, name: true, curso: true },
  });

  if (!student?.discResult) {
    return NextResponse.json({ error: "Nenhum teste DISC realizado ainda." }, { status: 404 });
  }

  const html = gerarRelatorioDisc({
    resultado: student.discResult,
    grafico: student.discData,
    nome: student.name,
    curso: student.curso || undefined,
  });

  const htmlPDF = wrapParaPDF(html, `Relatório DISC — ${student.name}`);
  return new Response(htmlPDF, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="relatorio-disc-${student.name?.replace(/\s+/g, "-").toLowerCase()}.html"`,
    },
  });
}
