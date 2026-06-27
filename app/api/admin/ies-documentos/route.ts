// GET  /api/admin/ies-documentos — lista documentos (admin only)
// POST /api/admin/ies-documentos — cria novo documento (admin only)

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }
  try {
    const docs = await prisma.smarterDocumento.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ documentos: docs });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { nome, tipo, url, descricao, vigencia } = body;
    if (!nome?.trim()) return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
    if (!url?.trim())  return NextResponse.json({ error: "URL é obrigatória." }, { status: 400 });

    const doc = await prisma.smarterDocumento.create({
      data: {
        nome: nome.trim(),
        tipo: tipo || "CERTIDAO",
        url: url.trim(),
        descricao: descricao?.trim() || null,
        vigencia: vigencia ? new Date(vigencia) : null,
        ativo: true,
      } as any,
    });
    return NextResponse.json({ documento: doc });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
