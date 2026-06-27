// POST /api/app/upload-arquivo
// Upload de imagens/PDFs para pasta public/uploads
// Retorna a URL pública do arquivo

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const maxDuration = 30;

const ALLOWED_IMG = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
const ALLOWED_PDF = ["application/pdf"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }

  try {
    const form = await req.formData();
    const arquivo = form.get("arquivo") as File | null;
    if (!arquivo || arquivo.size === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }
    if (arquivo.size > MAX_SIZE) {
      return NextResponse.json({ error: "Arquivo muito grande. Máximo: 10MB." }, { status: 400 });
    }
    const isImg = ALLOWED_IMG.includes(arquivo.type);
    const isPdf = ALLOWED_PDF.includes(arquivo.type);
    if (!isImg && !isPdf) {
      return NextResponse.json({ error: "Formato não permitido. Use PNG, JPG, WEBP ou PDF." }, { status: 400 });
    }

    const ext = arquivo.name.split(".").pop()?.toLowerCase() || (isPdf ? "pdf" : "png");
    const nomeArquivo = `${randomUUID()}.${ext}`;

    // Salvar em /public/uploads/
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const buffer = Buffer.from(await arquivo.arrayBuffer());
    await writeFile(path.join(uploadsDir, nomeArquivo), buffer);

    const url = `/uploads/${nomeArquivo}`;
    return NextResponse.json({ ok: true, url });
  } catch (e: any) {
    console.error("upload-arquivo error:", e);
    return NextResponse.json({ error: "Erro ao salvar arquivo." }, { status: 500 });
  }
}
