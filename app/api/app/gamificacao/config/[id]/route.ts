import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  // Apenas FRANQUEADORA pode alterar pontuação
  if (session?.user?.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Apenas a Franqueadora pode alterar pontuações." }, { status: 403 });
  }

  const { pontos } = await req.json();
  if (!pontos || isNaN(parseInt(pontos))) {
    return NextResponse.json({ error: "Valor inválido." }, { status: 400 });
  }

  const config = await prisma.gamificationConfig.update({
    where: { id: params.id },
    data: { pontos: parseInt(pontos) },
  });
  return NextResponse.json({ config });
}
