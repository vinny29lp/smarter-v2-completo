// POST /api/app/upload-arquivo
// Upload de imagens/PDFs para o Supabase Storage (bucket marketing-assets, pasta sistema/)
// Retorna a URL pública do arquivo.
// Antes gravava em public/uploads — não persiste em serverless (some no redeploy).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ALLOWED_IMG = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
const ALLOWED_PDF = ["application/pdf"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
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
    const path = `sistema/${randomUUID()}.${ext}`;

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const buffer = Buffer.from(await arquivo.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from("marketing-assets")
      .upload(path, buffer, { contentType: arquivo.type, upsert: false });

    if (uploadError) {
      console.error("[upload-arquivo] Supabase Storage error:", uploadError.message);
      return NextResponse.json({ error: `Falha no upload para o Storage: ${uploadError.message}` }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage.from("marketing-assets").getPublicUrl(path);
    return NextResponse.json({ ok: true, url: publicUrlData.publicUrl });
  } catch (e: any) {
    console.error("upload-arquivo error:", e);
    return NextResponse.json({ error: "Erro ao salvar arquivo." }, { status: 500 });
  }
}
