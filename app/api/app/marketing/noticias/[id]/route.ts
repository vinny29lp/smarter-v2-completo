import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isAdmin(session: any) {
  return (
    session?.user?.role === "FRANQUEADORA" ||
    (session?.user?.role === "EQUIPE" &&
      Array.isArray(session?.user?.permissoes) &&
      session.user.permissoes.includes("marketing"))
  );
}

// PUT /api/app/marketing/noticias/[id]
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session)) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  try {
    const body = await req.json();
    const { titulo, corpo, resumo, thumbUrl, autor, importante } = body;

    const noticia = await prisma.marketingNoticia.update({
      where: { id: params.id },
      data: {
        ...(titulo      !== undefined && { titulo }),
        ...(corpo       !== undefined && { corpo }),
        ...(resumo      !== undefined && { resumo }),
        ...(thumbUrl    !== undefined && { thumbUrl }),
        ...(autor       !== undefined && { autor }),
        ...(importante  !== undefined && { importante }),
      },
    });
    return NextResponse.json({ noticia });
  } catch (e: any) {
    console.error("[marketing/noticias/:id] PUT:", e?.message);
    return NextResponse.json({ error: "Erro ao atualizar notícia." }, { status: 500 });
  }
}

// DELETE /api/app/marketing/noticias/[id]
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session)) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  try {
    await prisma.marketingNoticia.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[marketing/noticias/:id] DELETE:", e?.message);
    return NextResponse.json({ error: "Erro ao excluir notícia." }, { status: 500 });
  }
}
