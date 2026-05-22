import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  // Exclui instituições auto-criadas pelo cadastro público de estudantes
  const instituicoes = await prisma.institution.findMany({
    where: { OR: [{ tipo: null }, { tipo: { not: "auto" } }] },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ instituicoes });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "Nome e obrigatorio." }, { status: 400 });
  const inst = await prisma.institution.create({ data: body });
  return NextResponse.json({ instituicao: inst });
}
