import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (!["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO", "EQUIPE"].includes(role)) {
    return NextResponse.json({ error: "Sem acesso." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const categoria  = searchParams.get("categoria") || "";
  const tipo       = searchParams.get("tipo") || "";
  const busca      = searchParams.get("busca") || "";
  const destaque   = searchParams.get("destaque") === "true";
  const campanhaId = searchParams.get("campanhaId") || "";
  const favoritos  = searchParams.get("favoritos") === "true";

  const where: any = { ativo: true };

  // Franqueado só vê conteúdos TODOS ou FRANQUEADO
  if (role === "FRANQUEADO" || role === "FUNCIONARIO") {
    where.publicoPara = { in: ["TODOS", "FRANQUEADO"] };
  }

  if (categoria) where.categoria = categoria;
  if (tipo) where.tipo = tipo;
  if (destaque) where.destaque = true;
  if (campanhaId) where.campanhaId = campanhaId;
  if (busca) {
    where.OR = [
      { titulo: { contains: busca, mode: "insensitive" } },
      { descricao: { contains: busca, mode: "insensitive" } },
      { texto: { contains: busca, mode: "insensitive" } },
    ];
  }

  try {
    let conteudos = await prisma.marketingConteudo.findMany({
      where,
      include: {
        campanha: { select: { id: true, nome: true, cor: true } },
        _count: { select: { favoritos: true, downloadLogs: true } },
      },
      orderBy: [{ destaque: "desc" }, { createdAt: "desc" }],
      take: 200,
    });

    // Busca favoritos do usuário UMA ÚNICA VEZ e reutiliza para filtro + flag
    const favsUser = await prisma.marketingFavorito.findMany({
      where: { userId: session.user.id },
      select: { conteudoId: true },
    });
    const favIdsSet = new Set(favsUser.map((f: any) => f.conteudoId));

    if (favoritos) {
      conteudos = conteudos.filter((c: any) => favIdsSet.has(c.id));
    }

    const result = conteudos.map((c: any) => ({ ...c, isFavorito: favIdsSet.has(c.id) }));

    return NextResponse.json({ conteudos: result, total: result.length });
  } catch (e: any) {
    console.error("[marketing/conteudos] GET error:", e?.message);
    return NextResponse.json({ error: "Erro ao carregar conteúdos." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isMarketingAdmin = session.user.role === "FRANQUEADORA" ||
    (session.user.role === "EQUIPE" && Array.isArray((session.user as any).permissoes) && (session.user as any).permissoes.includes("marketing"));
  if (!isMarketingAdmin) {
    return NextResponse.json({ error: "Sem permissão para criar conteúdos." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { titulo, descricao, tipo, formato, categoria, tags, url, thumbUrl, texto,
            hashtags, canalIdeal, publicoPara, destaque, campanhaId, isFixo, tamanhoKb } = body;

    if (!titulo || !tipo || !categoria) {
      return NextResponse.json({ error: "titulo, tipo e categoria são obrigatórios." }, { status: 400 });
    }

    const conteudo = await prisma.marketingConteudo.create({
      data: {
        titulo, descricao, tipo,
        formato: formato || "IMAGEM",
        categoria,
        tags: tags || [],
        url, thumbUrl, texto, hashtags, canalIdeal,
        publicoPara: publicoPara || "TODOS",
        destaque: destaque || false,
        isFixo: isFixo || false,
        tamanhoKb: tamanhoKb || null,
        campanhaId: campanhaId || null,
      },
    });

    // Notificar franqueados em background (fire-and-forget) — não bloqueia o response
    // Só notifica se o conteúdo for visível para FRANQUEADO (publicoPara TODOS ou FRANQUEADO)
    if (publicoPara !== "FRANQUEADORA") {
    Promise.resolve().then(async () => {
      try {
        const franqueados = await prisma.user.findMany({
          where: { role: "FRANQUEADO" as any },
          select: { id: true },
        });
        if (franqueados.length > 0) {
          await prisma.notification.createMany({
            data: franqueados.map((u: any) => ({
              userId: u.id,
              titulo: "📢 Novo conteúdo no Marketing Hub",
              mensagem: `"${titulo}" foi adicionado à biblioteca. Acesse o Marketing Hub para baixar.`,
              tipo: "marketing",
              link: "/dashboard/marketing/biblioteca",
            })),
            skipDuplicates: true,
          });
        }
      } catch (err: any) {
        console.error("[marketing/conteudos] notificação background:", err?.message);
      }
    });
    } // fim if publicoPara !== "FRANQUEADORA"

    return NextResponse.json({ conteudo });
  } catch (e: any) {
    console.error("[marketing/conteudos] POST error:", e?.message);
    return NextResponse.json({ error: "Erro ao criar conteúdo." }, { status: 500 });
  }
}
