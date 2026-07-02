import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO", "EQUIPE"].includes(session.user.role)) {
    return NextResponse.json({ error: "Sem acesso." }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "";

    const where: any = {};
    if (status) where.status = status;

    const campanhas = await prisma.marketingCampanha.findMany({
      where,
      include: {
        _count: { select: { conteudos: true, calendario: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ campanhas });
  } catch (e: any) {
    console.error("[marketing/campanhas] GET:", e?.message);
    return NextResponse.json({ error: "Erro ao carregar campanhas." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const isMarketingAdmin = session.user.role === "FRANQUEADORA" ||
    (session.user.role === "EQUIPE" && Array.isArray((session.user as any).permissoes) && (session.user as any).permissoes.includes("marketing"));
  if (!isMarketingAdmin) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  try {
    const { nome, descricao, objetivo, status, inicioAt, fimAt, cor } = await req.json();
    if (!nome) return NextResponse.json({ error: "Nome obrigatório." }, { status: 400 });

    const campanha = await prisma.marketingCampanha.create({
      data: {
        nome, descricao, objetivo,
        status: status || "ATIVA",
        inicioAt: inicioAt ? new Date(inicioAt) : null,
        fimAt: fimAt ? new Date(fimAt) : null,
        cor: cor || "#0D2B5C",
      },
    });

    return NextResponse.json({ campanha });
  } catch (e: any) {
    console.error("[marketing/campanhas] POST:", e?.message);
    return NextResponse.json({ error: "Erro ao criar campanha." }, { status: 500 });
  }
}
