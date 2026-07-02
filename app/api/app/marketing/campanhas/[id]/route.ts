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

// PUT /api/app/marketing/campanhas/[id]
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session)) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  try {
    const body = await req.json();
    const { nome, descricao, objetivo, status, inicioAt, fimAt, cor } = body;

    const campanha = await prisma.marketingCampanha.update({
      where: { id: params.id },
      data: {
        ...(nome       !== undefined && { nome }),
        ...(descricao  !== undefined && { descricao }),
        ...(objetivo   !== undefined && { objetivo }),
        ...(status     !== undefined && { status }),
        ...(inicioAt   !== undefined && { inicioAt: inicioAt ? new Date(inicioAt) : null }),
        ...(fimAt      !== undefined && { fimAt: fimAt ? new Date(fimAt) : null }),
        ...(cor        !== undefined && { cor }),
      },
    });
    return NextResponse.json({ campanha });
  } catch (e: any) {
    console.error("[marketing/campanhas/:id] PUT:", e?.message);
    return NextResponse.json({ error: "Erro ao atualizar campanha." }, { status: 500 });
  }
}

// DELETE /api/app/marketing/campanhas/[id]
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session)) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  try {
    // Desvincula conteúdos da campanha antes de excluir (campanhaId → null)
    await prisma.marketingConteudo.updateMany({
      where: { campanhaId: params.id },
      data: { campanhaId: null },
    });
    await prisma.marketingCalendario.updateMany({
      where: { campanhaId: params.id },
      data: { campanhaId: null },
    });
    await prisma.marketingCampanha.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[marketing/campanhas/:id] DELETE:", e?.message);
    return NextResponse.json({ error: "Erro ao excluir campanha." }, { status: 500 });
  }
}
