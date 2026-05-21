import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.franchiseId) return NextResponse.json({ config: null });

  const franchise = await prisma.franchise.findUnique({
    where: { id: session.user.franchiseId },
    select: { chavePix: true, linkPagamento: true, instrucaoPagamento: true },
  });
  return NextResponse.json({ config: franchise });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.franchiseId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const franchise = await prisma.franchise.update({
      where: { id: session.user.franchiseId },
      data: {
        chavePix:           body.chavePix           !== undefined ? body.chavePix           : undefined,
        linkPagamento:      body.linkPagamento      !== undefined ? body.linkPagamento      : undefined,
        instrucaoPagamento: body.instrucaoPagamento !== undefined ? body.instrucaoPagamento : undefined,
      },
      select: { chavePix: true, linkPagamento: true, instrucaoPagamento: true },
    });
    return NextResponse.json({ config: franchise });
  } catch (err: any) {
    console.error("[config-pagamento PATCH]", err);
    return NextResponse.json({ error: "Erro ao salvar configuração: " + (err?.message || "Erro desconhecido") }, { status: 500 });
  }
}
