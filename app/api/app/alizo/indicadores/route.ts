/**
 * GET /api/app/alizo/indicadores — indicadores dos funcionários digitais (Alizo) por unidade, últimos 30 dias.
 * FRANQUEADO vê só a sua unidade; FRANQUEADORA/EQUIPE veem todas + status técnico da integração.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { criarAlizoClient, mascararTelefone } from "@/lib/alizo/client";
import { recrutadorAtivo } from "@/lib/alizo/recrutadorRegras";

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

    // Status do WhatsApp de cada unidade (vem da Alizo; sem chave ou fora do ar → "desconhecido")
    const whatsPorUnidade = new Map<string, string | null>();
    let alizoOk = false;
    const client = criarAlizoClient();
    if (client) {
      try {
        const r = await client.units();
        for (const u of r.units) whatsPorUnidade.set(u.id, u.whatsapp_phone);
        alizoOk = true;
      } catch (e: any) { console.error("[alizo-indicadores] units falhou:", e?.status); }
    }

    const unidades = await Promise.all(mapa.map(async (m) => {
      const escopo: any = m.franchiseKey === "MATRIZ" ? { franchiseId: null } : { franchiseId: m.franchiseKey };
      const [maps, enviados, respostas, ganhos, ultimaResposta] = await Promise.all([
        prisma.crmLead.count({ where: { ...escopo, origem: "google_maps", createdAt: { gte: desde } } }),
        prisma.crmLead.count({ where: { ...escopo, alizoLeadId: { not: null }, createdAt: { gte: desde } } }),
        prisma.crmNota.count({ where: { lead: escopo, tipo: "whatsapp", texto: { startsWith: "💬" }, createdAt: { gte: desde } } }),
        prisma.crmNota.count({ where: { lead: escopo, tipo: "etapa", texto: { contains: "Sales Rep da Alizo" }, createdAt: { gte: desde } } }),
        prisma.crmNota.findFirst({ where: { lead: escopo, tipo: "whatsapp", texto: { startsWith: "💬" } }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
      ]);
      const [vagasNaAlizo, candidatosEnviados, atividade] = await Promise.all([
        m.franchiseKey === "MATRIZ" ? Promise.resolve(0) : prisma.vacancy.count({ where: { franchiseId: m.franchiseKey, alizoJobId: { not: null } } }),
        m.franchiseKey === "MATRIZ" ? Promise.resolve(0) : prisma.automacaoEnvio.count({
          where: { tipo: "ALIZO_CANDIDATO", createdAt: { gte: desde }, refId: { in: (await prisma.application.findMany({ where: { vacancy: { franchiseId: m.franchiseKey } }, select: { id: true }, take: 2000 })).map(a => a.id) } },
        }),
        prisma.crmNota.findMany({
          where: { lead: escopo, tipo: { in: ["whatsapp", "etapa"] }, OR: [{ texto: { startsWith: "💬" } }, { texto: { startsWith: "🤖" } }, { texto: { startsWith: "🏆" } }] },
          orderBy: { createdAt: "desc" }, take: 8, select: { id: true, texto: true, createdAt: true, lead: { select: { empresa: true } } },
        }),
      ]);
      const tel = whatsPorUnidade.get(m.alizoUnitId);
      return {
        whatsapp: !alizoOk ? { status: "desconhecido" as const } : tel ? { status: "conectado" as const, numero: mascararTelefone(tel) } : { status: "nao_conectado" as const },
        recrutador: { vagasNaAlizo, candidatosEnviados },
        atividade: atividade.map(a => ({ id: a.id, texto: a.texto.slice(0, 140), quando: a.createdAt, lead: a.lead?.empresa ?? null })),
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
        recrutadorAtivo: recrutadorAtivo(),
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
