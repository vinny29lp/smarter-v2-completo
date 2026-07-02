import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// POST /api/app/marketing/favoritos — toggle favorito
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { conteudoId } = await req.json();
    if (!conteudoId) return NextResponse.json({ error: "conteudoId obrigatório." }, { status: 400 });

    const db = prisma as any;
    const existing = await db.marketingFavorito.findUnique({
      where: { conteudoId_userId: { conteudoId, userId: session.user.id } },
    });

    if (existing) {
      await db.marketingFavorito.delete({
        where: { conteudoId_userId: { conteudoId, userId: session.user.id } },
      });
      return NextResponse.json({ favorito: false });
    } else {
      await db.marketingFavorito.create({
        data: { conteudoId, userId: session.user.id },
      });
      return NextResponse.json({ favorito: true });
    }
  } catch (e: any) {
    console.error("[marketing/favoritos] POST:", e?.message);
    return NextResponse.json({ error: "Erro ao atualizar favorito." }, { status: 500 });
  }
}
