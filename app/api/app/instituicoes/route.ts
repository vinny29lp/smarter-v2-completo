import { prisma } from "@/lib/prisma";
import { enviarBoasVindasInstituicao } from "@/lib/email";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkPermission } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permCheck = checkPermission(session, "instituicoes");
  if (permCheck) return permCheck;

  // Exclui instituições auto-criadas pelo cadastro público de estudantes
  const instituicoes = await prisma.institution.findMany({
    where: { OR: [{ tipo: null }, { tipo: { not: "auto" } }] },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ instituicoes });
  } catch (e) {
    return handleApiError(e, "INSTITUICOES_GET");
  }
}

export async function POST(req: Request) {
  try {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permCheck = checkPermission(session, "instituicoes");
  if (permCheck) return permCheck;

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
  } catch (e) {
    return handleApiError(e, "INSTITUICOES_POST");
  }
}
