/**
 * GET /api/app/alizo/indicadores — indicadores dos funcionários digitais (Alizo) por unidade, últimos 30 dias.
 * FRANQUEADO vê só a sua unidade; FRANQUEADORA/EQUIPE veem todas + status técnico da integração.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role || "";
  if (!["FRANQUEADO", "FRANQUEADORA", "EQUIPE"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const master = role !== "FRANQUEADO";
  const franchiseId = (session.user as any).franchiseId as string | undefined;
  if (!master && !franchiseId) return NextResponse.json({ error: "Usuário sem unidade" }, { status: 400 });

  try {
    const desde = new Date(Date.now() - 30 * 86_400_000);
    const mapa = await prisma.alizoUnidade.findMany({
      where: master ? {} : { franchiseKey: franchiseId! },
    });

    const unidades = await Promise.all(mapa.map(async (m) => {
      const escopo: any = m.franchiseKey === "MATRIZ" ? { franchiseId: null } : { franchiseId: m.franchiseKey };
      const [maps, enviados, respostas, ganhos, ultimaResposta] = await Promise.all([
        prisma.crmLead.count({ where: { ...escopo, origem: "google_maps", createdAt: { gte: desde } } }),
        prisma.crmLead.count({ where: { ...escopo, alizoLeadId: { not: null }, createdAt: { gte: desde } } }),
        prisma.crmNota.count({ where: { lead: escopo, tipo: "whatsapp", texto: { startsWith: "💬" }, createdAt: { gte: desde } } }),
        prisma.crmNota.count({ where: { lead: escopo, tipo: "etapa", texto: { contains: "Sales Rep da Alizo" }, createdAt: { gte: desde } } }),
        prisma.crmNota.findFirst({ where: { lead: escopo, tipo: "whatsapp", texto: { startsWith: "💬" } }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
      ]);
      return {
        chave: m.franchiseKey, nome: m.nome || m.franchiseKey,
        leadsMaps: maps, leadsNaAlizo: enviados, respostas, negociosGanhos: ganhos,
        ultimaResposta: ultimaResposta?.createdAt ?? null,
      };
    }));

    let status: any = null;
    if (master) {
      const [eventos7d, ultimoEvento] = await Promise.all([
        prisma.alizoEvento.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 86_400_000) } } }),
        prisma.alizoEvento.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true, tipo: true } }),
      ]);
      status = {
        chaveConfigurada: !!process.env.ALIZO_PARTNER_API_KEY,
        webhookConfigurado: !!process.env.ALIZO_WEBHOOK_SECRET,
        gatilhoLeadsAtivo: process.env.ALIZO_GATILHO_LEADS_ATIVO === "true",
        unidadesMapeadas: mapa.length,
        eventos7d, ultimoEvento,
      };
    }
    return NextResponse.json({ escopo: master ? "rede" : "unidade", periodoDias: 30, unidades, status });
  } catch (e: any) {
    console.error("[alizo-indicadores] erro:", e?.message);
    return NextResponse.json({ error: "Erro ao carregar indicadores" }, { status: 500 });
  }
}
