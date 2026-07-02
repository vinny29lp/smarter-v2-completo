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

// PUT /api/app/marketing/calendario/[id]
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session)) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  try {
    const body = await req.json();
    const { titulo, descricao, data, tipo, cor, campanhaId, conteudoId, recorrente } = body;

    const evento = await prisma.marketingCalendario.update({
      where: { id: params.id },
      data: {
        ...(titulo      !== undefined && { titulo }),
        ...(descricao   !== undefined && { descricao }),
        ...(data        !== undefined && { data: new Date(data) }),
        ...(tipo        !== undefined && { tipo }),
        ...(cor         !== undefined && { cor }),
        ...(campanhaId  !== undefined && { campanhaId: campanhaId || null }),
        ...(conteudoId  !== undefined && { conteudoId: conteudoId || null }),
        ...(recorrente  !== undefined && { recorrente }),
      },
    });
    return NextResponse.json({ evento });
  } catch (e: any) {
    console.error("[marketing/calendario/:id] PUT:", e?.message);
    return NextResponse.json({ error: "Erro ao atualizar evento." }, { status: 500 });
  }
}

// DELETE /api/app/marketing/calendario/[id]
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session)) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  try {
    await prisma.marketingCalendario.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[marketing/calendario/:id] DELETE:", e?.message);
    return NextResponse.json({ error: "Erro ao excluir evento." }, { status: 500 });
  }
}
