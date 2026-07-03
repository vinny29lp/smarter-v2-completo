import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Cotas de arquivos ROTATIVOS por tipo (isFixo=false)
const COTAS: Record<string, number> = {
  REELS:     3,
  POST_FEED: 5,
  STORY:     5,
};

// POST /api/app/marketing/upload
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isMarketingAdmin =
    session.user.role === "FRANQUEADORA" ||
    (session.user.role === "EQUIPE" &&
      Array.isArray((session.user as any).permissoes) &&
      (session.user as any).permissoes.includes("marketing"));

  if (!isMarketingAdmin) {
    return NextResponse.json({ error: "Sem permissão para fazer upload." }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Supabase não configurado. Adicione NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  try {
    const formData = await req.formData();
    const file     = formData.get("file") as File | null;
    const tipo     = (formData.get("tipo") as string | null) || "TEMPLATE";
    const isFixo   = formData.get("isFixo") === "true";

    if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });

    // Validar tipo MIME
    const MIMES_PERMITIDOS = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "video/mp4", "video/quicktime",
      "application/pdf",
    ];
    if (!MIMES_PERMITIDOS.includes(file.type)) {
      return NextResponse.json(
        { error: `Tipo de arquivo não permitido: ${file.type}. Use JPG, PNG, GIF, WEBP, MP4, MOV ou PDF.` },
        { status: 400 }
      );
    }

    // Validar tamanho: vídeo ≤ 100 MB, imagem/PDF ≤ 20 MB
    const MAX_VIDEO = 100 * 1024 * 1024;
    const MAX_IMG   = 20  * 1024 * 1024;
    const isVideo   = file.type.startsWith("video/");
    if (isVideo && file.size > MAX_VIDEO) {
      return NextResponse.json({ error: "Vídeo não pode ultrapassar 100 MB." }, { status: 400 });
    }
    if (!isVideo && file.size > MAX_IMG) {
      return NextResponse.json({ error: "Arquivo não pode ultrapassar 20 MB." }, { status: 400 });
    }

    // Verificar cota para arquivos ROTATIVOS
    if (!isFixo && COTAS[tipo] !== undefined) {
      const ativos = await prisma.marketingConteudo.count({
        where: { tipo, ativo: true, isFixo: false },
      });
      if (ativos >= COTAS[tipo]) {
        return NextResponse.json(
          {
            error: `Cota atingida para ${tipo}: máximo ${COTAS[tipo]} arquivo${COTAS[tipo] > 1 ? "s" : ""} rotativo${COTAS[tipo] > 1 ? "s" : ""} ativo${COTAS[tipo] > 1 ? "s" : ""}. Desative um antes de subir outro.`,
          },
          { status: 422 }
        );
      }
    }

    // Gerar nome único para o arquivo
    const ext  = file.name.split(".").pop()?.toLowerCase() || "bin";
    const uuid = crypto.randomUUID();
    const path = `${tipo}/${uuid}.${ext}`;

    // Upload para Supabase Storage via cliente oficial
    const buffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("marketing-assets")
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[marketing/upload] Supabase Storage error:", uploadError.message);
      return NextResponse.json({ error: `Falha no upload para o Storage: ${uploadError.message}` }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from("marketing-assets")
      .getPublicUrl(path);

    const url       = publicUrlData.publicUrl;
    const tamanhoKb = Math.ceil(file.size / 1024);

    return NextResponse.json({ url, tamanhoKb, path });
  } catch (e: any) {
    console.error("[marketing/upload] POST:", e?.message);
    return NextResponse.json({ error: "Erro ao processar upload." }, { status: 500 });
  }
}

// DELETE /api/app/marketing/upload?path=POST_FEED/uuid.jpg
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isMarketingAdmin =
    session.user.role === "FRANQUEADORA" ||
    (session.user.role === "EQUIPE" &&
      Array.isArray((session.user as any).permissoes) &&
      (session.user as any).permissoes.includes("marketing"));

  if (!isMarketingAdmin) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");
  if (!path) return NextResponse.json({ error: "path obrigatório." }, { status: 400 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return NextResponse.json({ ok: true });

  try {
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });
    await supabase.storage.from("marketing-assets").remove([path]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[marketing/upload] DELETE:", e?.message);
    return NextResponse.json({ ok: true });
  }
}
