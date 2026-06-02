import { prisma } from "@/lib/prisma";
import { enviarBoasVindasInstituicao } from "@/lib/email";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Exclui instituições auto-criadas pelo cadastro público de estudantes
  const instituicoes = await prisma.institution.findMany({
    where: { OR: [{ tipo: null }, { tipo: { not: "auto" } }] },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ instituicoes });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });

  const inst = await prisma.institution.create({ data: body });

  // Enviar e-mail de boas-vindas se a instituição tiver e-mail cadastrado (não-bloqueante)
  if (inst.email) {
    enviarBoasVindasInstituicao({
      email:            inst.email,
      nomeInstituicao:  inst.name,
      nomeContato:      inst.coordenador || undefined,
    }).catch(e => console.warn("[email] Falha boas-vindas instituição:", e));
  }

  return NextResponse.json({ instituicao: inst });
}
