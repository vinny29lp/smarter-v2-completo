import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = prisma as any;
    const conteudo = await db.marketingConteudo.findUnique({
      where: { id: params.id },
      include: {
        campanha: { select: { id: true, nome: true, cor: true } },
        _count: { select: { favoritos: true, downloadLogs: true } },
      },
    });
    if (!conteudo) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

    // Incrementar visualizações
    await db.marketingConteudo.update({
      where: { id: params.id },
      data: { visualizacoes: { increment: 1 } },
    });

    const isFavorito = await db.marketingFavorito.findUnique({
      where: { conteudoId_userId: { conteudoId: params.id, userId: session.user.id } },
    });

    return NextResponse.json({ conteudo: { ...conteudo, isFavorito: !!isFavorito } });
  } catch (e: any) {
    console.error("[marketing/conteudos/id] GET:", e?.message);
    return NextResponse.json({ error: "Erro." }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const db = prisma as any;
    const conteudo = await db.marketingConteudo.update({
      where: { id: params.id },
      data: {
        ...(body.titulo !== undefined && { titulo: body.titulo }),
        ...(body.descricao !== undefined && { descricao: body.descricao }),
        ...(body.tipo !== undefined && { tipo: body.tipo }),
        ...(body.formato !== undefined && { formato: body.formato }),
        ...(body.categoria !== undefined && { categoria: body.categoria }),
        ...(body.tags !== undefined && { tags: body.tags }),
        ...(body.url !== undefined && { url: body.url }),
        ...(body.thumbUrl !== undefined && { thumbUrl: body.thumbUrl }),
        ...(body.texto !== undefined && { texto: body.texto }),
        ...(body.hashtags !== undefined && { hashtags: body.hashtags }),
        ...(body.canalIdeal !== undefined && { canalIdeal: body.canalIdeal }),
        ...(body.publicoPara !== undefined && { publicoPara: body.publicoPara }),
        ...(body.ativo !== undefined && { ativo: body.ativo }),
        ...(body.destaque !== undefined && { destaque: body.destaque }),
        ...(body.campanhaId !== undefined && { campanhaId: body.campanhaId || null }),
      },
    });
    return NextResponse.json({ conteudo });
  } catch (e: any) {
    console.error("[marketing/conteudos/id] PUT:", e?.message);
    return NextResponse.json({ error: "Erro ao atualizar." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  try {
    const db = prisma as any;
    await db.marketingConteudo.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[marketing/conteudos/id] DELETE:", e?.message);
    return NextResponse.json({ error: "Erro ao excluir." }, { status: 500 });
  }
}
