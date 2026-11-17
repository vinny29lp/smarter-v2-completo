/**
 * GET  /api/app/alizo/prospeccao[?franchiseId=] — painel da prospecção: capturadas hoje, limite diário, histórico local,
 *                                                  regiões e próxima possibilidade. Só dados da própria unidade.
 * POST /api/app/alizo/prospeccao — executa a prospecção do dia (1 por dia/unidade; respeita o limite de 15 e as regiões cadastradas).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-response";
import { contextoAlizo, franquiaAlvo } from "@/lib/alizo/acesso";
import { normalizarRegioes, regiaoComoTexto } from "@/lib/onboarding/regras";
import { capturadasDoDetalhe, LIMITE_PROSPECCAO_DIA, restanteProspeccaoHoje } from "@/lib/alizo/unidadesRegras";
import { prospeccaoRegional } from "@/lib/alizo/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const inicioDoDia = () => { const a = new Date(); return new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate())); };

export async function GET(req: Request) {
  try {
    const ctx = await contextoAlizo({ rota: "prospeccao-get", max: 60 });
    if ("erro" in ctx) return ctx.erro;
    const fid = franquiaAlvo(ctx, new URL(req.url).searchParams.get("franchiseId"));
    if (!fid) return NextResponse.json({ error: "Franquia não informada." }, { status: 400 });
    const [f, runs] = await Promise.all([
      prisma.franchise.findUnique({ where: { id: fid }, select: { uf: true, regioesAtuacao: true } as any }) as any,
      prisma.automacaoEnvio.findMany({ where: { tipo: "ALIZO_PROSPECCAO", refId: fid }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, detalhe: true, createdAt: true } }),
    ]);
    if (!f) return NextResponse.json({ error: "Franquia não encontrada." }, { status: 404 });
    const hoje = inicioDoDia();
    const capturadasHoje = runs.filter(r => r.createdAt >= hoje).reduce((a, r) => a + capturadasDoDetalhe(r.detalhe), 0);
    const jaRodouHoje = runs.some(r => r.createdAt >= hoje);
    return NextResponse.json({
      limiteDiario: LIMITE_PROSPECCAO_DIA, capturadasHoje, restante: restanteProspeccaoHoje(capturadasHoje),
      regioes: normalizarRegioes(f.regioesAtuacao).map(r => regiaoComoTexto(r, f.uf)),
      proximaExecucao: jaRodouHoje ? "amanha" : "hoje",
      historico: runs.map(r => ({ id: r.id, quando: r.createdAt, resumo: r.detalhe, falhou: /^ERRO/.test(r.detalhe || "") })),
    });
  } catch (e) { return handleApiError(e, "ALIZO_PROSPECCAO_GET"); }
}

export async function POST(req: Request) {
  try {
    const ctx = await contextoAlizo({ rota: "prospeccao-post", max: 10 });
    if ("erro" in ctx) return ctx.erro;
    const body = await req.json().catch(() => ({}));
    const fid = franquiaAlvo(ctx, body.franchiseId ? String(body.franchiseId) : null);
    if (!fid) return NextResponse.json({ error: "Franquia não informada." }, { status: 400 });
    const jaHoje = await prisma.automacaoEnvio.findFirst({ where: { tipo: "ALIZO_PROSPECCAO", refId: fid, createdAt: { gte: inicioDoDia() } }, select: { id: true } });
    if (jaHoje) return NextResponse.json({ error: "O limite de prospecção de hoje já foi atingido. Nova execução amanhã." }, { status: 409 });
    const r: any = await prospeccaoRegional({ somenteFranquia: fid, max: 1 });
    if (!r.ok) return NextResponse.json({ error: "Configuração administrativa necessária." }, { status: 503 });
    if (r.pausadas > 0) return NextResponse.json({ error: "A busca está pausada: há muitas empresas esperando o seu contato. Trate pelo menos 40 (contatar, marcar reunião, sem interesse ou venda) para liberar novas buscas." }, { status: 409 });
    if (r.unidades === 0) return NextResponse.json({ error: "A unidade ainda não está pronta para prospectar (assistente de primeiro acesso ou região pendente)." }, { status: 409 });
    return NextResponse.json({ ok: true, capturadas: r.capturados, erros: r.erros });
  } catch (e) { return handleApiError(e, "ALIZO_PROSPECCAO_POST"); }
}
