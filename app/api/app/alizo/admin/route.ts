/**
 * Super Admin (FRANQUEADORA) — painel de saúde e operação da integração Alizo.
 * GET  → situação de cada franquia (vínculo, status, último erro, versão do modelo) + eventos que falharam + webhooks.
 * POST { acao: "verificar" | "sincronizar" | "modelo" | "backfill" | "reprocessar_eventos" | "replay_webhook", ... }
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-response";
import { contextoAlizo } from "@/lib/alizo/acesso";
import { criarAlizoClient, mensagemAmigavel } from "@/lib/alizo/client";
import { sincronizarFranquiaAlizo, backfillAlizo, verificarVinculoAlizo, reaplicarModeloAlizo } from "@/lib/alizo/provisionar";
import { reprocessarEventosFalhos } from "@/lib/alizo/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const ctx = await contextoAlizo({ soAdmin: true, rota: "admin-get", max: 30 });
    if ("erro" in ctx) return ctx.erro;
    const [franquias, mapa, falhos] = await Promise.all([
      prisma.franchise.findMany({
        select: { id: true, name: true, status: true, alizoSyncStatus: true, alizoSyncedAt: true, alizoLastError: true, alizoTemplateVersion: true },
        orderBy: { name: "asc" },
      }),
      prisma.alizoUnidade.findMany({ select: { franchiseKey: true } }),
      prisma.alizoEvento.count({ where: { status: "falhou" } }),
    ]);
    const vinc = new Set(mapa.map(m => m.franchiseKey));
    let webhooks: Array<{ id: string; url?: string; active?: boolean }> | null = null;
    const client = criarAlizoClient();
    if (client) { try { webhooks = ((await client.listarWebhooks()).webhooks || []).map((w: any) => ({ id: w.id, url: w.url, active: w.active })); } catch { webhooks = null; } }
    return NextResponse.json({
      configurado: !!client, segredoWebhook: !!process.env.ALIZO_WEBHOOK_SECRET, eventosFalhos: falhos, webhooks,
      franquias: franquias.map(f => ({ ...f, vinculada: vinc.has(f.id) })),
    });
  } catch (e) { return handleApiError(e, "ALIZO_ADMIN_GET"); }
}

export async function POST(req: Request) {
  try {
    const ctx = await contextoAlizo({ soAdmin: true, rota: "admin-post", max: 20 });
    if ("erro" in ctx) return ctx.erro;
    const body = await req.json().catch(() => ({}));
    const acao = String(body.acao || "");
    const fid = body.franchiseId ? String(body.franchiseId) : "";
    const existe = async () => !!fid && !!(await prisma.franchise.findUnique({ where: { id: fid }, select: { id: true } }));

    if (acao === "verificar") { if (!(await existe())) return NextResponse.json({ error: "Franquia inválida." }, { status: 400 }); return NextResponse.json(await verificarVinculoAlizo(fid)); }
    if (acao === "sincronizar") { if (!(await existe())) return NextResponse.json({ error: "Franquia inválida." }, { status: 400 }); return NextResponse.json(await sincronizarFranquiaAlizo(fid)); }
    if (acao === "modelo") { if (!(await existe())) return NextResponse.json({ error: "Franquia inválida." }, { status: 400 }); return NextResponse.json(await reaplicarModeloAlizo(fid)); }
    if (acao === "backfill") return NextResponse.json(await backfillAlizo(50, Array.isArray(body.excluirIds) ? body.excluirIds.map(String).slice(0, 200) : []));
    if (acao === "reprocessar_eventos") return NextResponse.json(await reprocessarEventosFalhos());
    if (acao === "replay_webhook") {
      const client = criarAlizoClient();
      const since = String(body.since || "");
      if (!client || !body.webhookId || Number.isNaN(Date.parse(since))) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
      try { return NextResponse.json({ ok: true, resultado: await client.reenviarWebhook(String(body.webhookId), new Date(since).toISOString()) }); }
      catch (e) { return NextResponse.json({ error: mensagemAmigavel(e) }, { status: 502 }); }
    }
    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch (e) { return handleApiError(e, "ALIZO_ADMIN_POST"); }
}
