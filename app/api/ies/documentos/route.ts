// GET  /api/ies/documentos — lista documentos Smarter (autenticado ou público)
// POST /api/ies/documentos — adiciona documento (FRANQUEADORA only)
// DELETE /api/ies/documentos?id=xxx — remove documento (FRANQUEADORA only)

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    const documentos = await prisma.smarterDocumento.findMany({
      where: { ativo: true },
      orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ documentos });
  } catch (e) {
    return handleApiError(e, "IES_DOCS_GET");
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "FRANQUEADORA") {
      return NextResponse.json({ error: "Apenas FRANQUEADORA pode gerenciar documentos." }, { status: 403 });
    }
    const body = await req.json();
    if (!body.nome || !body.url) return NextResponse.json({ error: "Nome e URL são obrigatórios." }, { status: 400 });

    const doc = await prisma.smarterDocumento.create({
      data: {
        nome: body.nome,
        tipo: body.tipo || "OUTRO",
        url: body.url,
        tamanho: body.tamanho || null,
        ordem: body.ordem || 0,
      },
    });
    return NextResponse.json({ doc });
  } catch (e) {
    return handleApiError(e, "IES_DOCS_POST");
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "FRANQUEADORA") {
      return NextResponse.json({ error: "Apenas FRANQUEADORA pode remover documentos." }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID do documento é obrigatório." }, { status: 400 });

    await prisma.smarterDocumento.update({ where: { id }, data: { ativo: false } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e, "IES_DOCS_DELETE");
  }
}
