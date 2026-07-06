/**
 * GET /api/app/marketing/upload/presign
 *
 * Gera uma URL assinada para upload DIRETO do browser ao Supabase Storage,
 * bypassando o Vercel (que tem limite de 4,5 MB para request body).
 * O arquivo nunca passa pelo servidor — só a permissão é validada aqui.
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const COTAS: Record<string, number> = {
  REELS:     3,
  POST_FEED: 5,
  STORY:     20,
  CARROSSEL: 20,
};

export async function GET(req: Request) {
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
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const tipo     = searchParams.get("tipo")     || "TEMPLATE";
  const isFixo   = searchParams.get("isFixo")   === "true";
  const fileName = searchParams.get("fileName") || "file";

  // Verificar cota para arquivos ROTATIVOS antes de permitir o upload
  if (!isFixo && COTAS[tipo] !== undefined) {
    const ativos = await prisma.marketingConteudo.count({
      where: { tipo, ativo: true, isFixo: false },
    });
    if (ativos >= COTAS[tipo]) {
      return NextResponse.json(
        { error: `Cota atingida para ${tipo}: máximo ${COTAS[tipo]} arquivo(s) rotativo(s) ativo(s). Desative um antes de subir outro.` },
        { status: 422 }
      );
    }
  }

  const ext  = fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const uuid = crypto.randomUUID();
  const path = `${tipo}/${uuid}.${ext}`;

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // Criar URL assinada de upload (válida por 5 min)
  const { data, error } = await supabase.storage
    .from("marketing-assets")
    .createSignedUploadUrl(path, { upsert: false });

  if (error || !data) {
    console.error("[presign] Supabase createSignedUploadUrl:", error?.message);
    return NextResponse.json({ error: `Erro ao preparar upload: ${error?.message}` }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage
    .from("marketing-assets")
    .getPublicUrl(path);

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token:     data.token,
    path,
    publicUrl,
  });
}
