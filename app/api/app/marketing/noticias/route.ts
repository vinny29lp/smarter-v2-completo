import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["FRANQUEADORA", "FRANQUEADO", "FUNCIONARIO", "EQUIPE"].includes(session.user.role)) {
    return NextResponse.json({ error: "Sem acesso." }, { status: 403 });
  }

  try {
    const db = prisma as any;
    const noticias = await db.marketingNoticia.findMany({
      orderBy: [{ importante: "desc" }, { publicadoEm: "desc" }],
      take: 50,
    });
    return NextResponse.json({ noticias });
  } catch (e: any) {
    console.error("[marketing/noticias] GET:", e?.message);
    return NextResponse.json({ error: "Erro ao carregar notícias." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const isMarketingAdmin = session.user.role === "FRANQUEADORA" ||
    (session.user.role === "EQUIPE" && Array.isArray((session.user as any).permissoes) && (session.user as any).permissoes.includes("marketing"));
  if (!isMarketingAdmin) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  try {
    const { titulo, corpo, resumo, thumbUrl, autor, importante } = await req.json();
    if (!titulo || !corpo) {
      return NextResponse.json({ error: "Título e corpo são obrigatórios." }, { status: 400 });
    }

    const db = prisma as any;
    const noticia = await db.marketingNoticia.create({
      data: { titulo, corpo, resumo, thumbUrl, autor, importante: importante || false },
    });

    // Notificar franqueados sobre nova notícia importante
    if (importante) {
      const franqueados = await prisma.user.findMany({
        where: { role: "FRANQUEADO" as any },
        select: { id: true },
      });
      if (franqueados.length > 0) {
        await prisma.notification.createMany({
          data: franqueados.map((u: any) => ({
            userId: u.id,
            titulo: "📰 Nova notícia da Rede Smarter",
            mensagem: titulo,
            tipo: "marketing",
            link: "/dashboard/marketing/noticias",
          })),
          skipDuplicates: true,
        });
      }
    }

    return NextResponse.json({ noticia });
  } catch (e: any) {
    console.error("[marketing/noticias] POST:", e?.message);
    return NextResponse.json({ error: "Erro ao publicar notícia." }, { status: 500 });
  }
}
