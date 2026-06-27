// PATCH /api/admin/ies-documentos/[id] — atualizar documento
// DELETE /api/admin/ies-documentos/[id] — remover (desativar) documento

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { nome, tipo, url, descricao, vigencia } = body;
    const doc = await prisma.smarterDocumento.update({
      where: { id: params.id },
      data: {
        ...(nome && { nome: nome.trim() }),
        ...(tipo && { tipo }),
        ...(url && { url: url.trim() }),
        descricao: descricao?.trim() || null,
        vigencia: vigencia ? new Date(vigencia) : null,
      } as any,
    });
    return NextResponse.json({ documento: doc });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }
  try {
    await prisma.smarterDocumento.update({
      where: { id: params.id },
      data: { ativo: false },
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
